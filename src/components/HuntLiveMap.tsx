"use client";

import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import type { Circle, CircleMarker, Map as LeafletMap } from "leaflet";

import { apiFetch } from "@/lib/client-fetch";
import type { HuntPlayerPositionsPayload } from "@/lib/mqtt/topics";
import { resolveBrowserMqttWsUrl } from "@/lib/mqtt/public-ws-url";

import "leaflet/dist/leaflet.css";

type LivePlayer = { d: string; lat: number; lng: number };

export type HuntLiveMapMqtt = {
  wsUrl: string;
  clientId: string;
  username: string;
  password: string | null;
  topics: { positions: string | null };
};

type Props = {
  huntId: string;
  latitude: number;
  longitude: number;
  radiusFt: number;
  mqtt: HuntLiveMapMqtt | null;
  live: boolean;
};

function feetToMeters(feet: number): number {
  return feet * 0.3048;
}

function parsePositionsPayload(raw: unknown): HuntPlayerPositionsPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Partial<HuntPlayerPositionsPayload>;
  if (!Array.isArray(record.players)) return null;
  const players: LivePlayer[] = [];
  for (const row of record.players) {
    if (!row || typeof row !== "object") continue;
    const deviceId = typeof row.d === "string" ? row.d : "";
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (!deviceId || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    players.push({ d: deviceId, lat, lng });
  }
  return {
    event: "positions",
    huntId: typeof record.huntId === "string" ? record.huntId : "",
    at: typeof record.at === "string" ? record.at : new Date().toISOString(),
    count: players.length,
    players,
  };
}

export default function HuntLiveMap({
  huntId,
  latitude,
  longitude,
  radiusFt,
  mqtt: mqttInfo,
  live,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const radiusRef = useRef<Circle | null>(null);
  const markersRef = useRef<Map<string, CircleMarker>>(new Map());
  const pendingPlayersRef = useRef<LivePlayer[] | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        preferCanvas: true,
        zoomControl: true,
        attributionControl: true,
      }).setView([latitude, longitude], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      L.circleMarker([latitude, longitude], {
        radius: 10,
        color: "#1d4ed8",
        weight: 3,
        fillColor: "#3b82f6",
        fillOpacity: 1,
      }).addTo(map);

      radiusRef.current = L.circle([latitude, longitude], {
        radius: feetToMeters(radiusFt),
        color: "#93c5fd",
        weight: 1,
        fillColor: "#bfdbfe",
        fillOpacity: 0.25,
      }).addTo(map);

      mapRef.current = map;
      const pending = pendingPlayersRef.current;
      if (pending) {
        pendingPlayersRef.current = null;
        const markers = markersRef.current;
        for (const player of pending) {
          const marker = L.circleMarker([player.lat, player.lng], {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            fillColor: "#22c55e",
            fillOpacity: 1,
          }).addTo(map);
          markers.set(player.d, marker);
        }
        setOnlineCount(pending.length);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      radiusRef.current = null;
      markersRef.current.clear();
    };
  }, [huntId, latitude, longitude, radiusFt]);

  useEffect(() => {
    const circle = radiusRef.current;
    if (!circle) return;
    circle.setRadius(feetToMeters(radiusFt));
    circle.setLatLng([latitude, longitude]);
  }, [latitude, longitude, radiusFt]);

  useEffect(() => {
    if (!live) {
      setOnlineCount(0);
      return;
    }

    let cancelled = false;
    const LPromise = import("leaflet");

    async function applyPlayers(players: LivePlayer[]) {
      const L = (await LPromise).default;
      const map = mapRef.current;
      if (cancelled) return;
      if (!map) {
        pendingPlayersRef.current = players;
        setOnlineCount(players.length);
        return;
      }

      const nextIds = new Set<string>();
      const markers = markersRef.current;

      for (const player of players) {
        nextIds.add(player.d);
        const existing = markers.get(player.d);
        if (existing) {
          existing.setLatLng([player.lat, player.lng]);
          continue;
        }
        const marker = L.circleMarker([player.lat, player.lng], {
          radius: 7,
          color: "#ffffff",
          weight: 2,
          fillColor: "#22c55e",
          fillOpacity: 1,
        }).addTo(map);
        markers.set(player.d, marker);
      }

      for (const [deviceId, marker] of markers) {
        if (nextIds.has(deviceId)) continue;
        map.removeLayer(marker);
        markers.delete(deviceId);
      }

      setOnlineCount(players.length);
    }

    async function refreshSnapshot() {
      try {
        const res = await apiFetch(`/api/hunts/${huntId}/live-positions`);
        const data = await res.json();
        if (cancelled || !res.ok || !data.success) return;
        const parsed = parsePositionsPayload(data);
        if (parsed) await applyPlayers(parsed.players);
      } catch {
        // MQTT snapshot is the fallback when polling fails.
      }
    }

    void refreshSnapshot();

    const pollTimer = window.setInterval(() => {
      void refreshSnapshot();
    }, 3000);

    const secureWsUrl = resolveBrowserMqttWsUrl(mqttInfo?.wsUrl ?? "");
    if (!secureWsUrl || !mqttInfo?.topics.positions) {
      return () => {
        cancelled = true;
        window.clearInterval(pollTimer);
      };
    }

    const client = mqtt.connect(secureWsUrl, {
      clientId: `${mqttInfo.clientId}-map`,
      username: mqttInfo.username,
      password: mqttInfo.password ?? undefined,
      reconnectPeriod: 2000,
      connectTimeout: 10_000,
      clean: true,
    });

    client.on("connect", () => {
      client.subscribe(mqttInfo.topics.positions!, { qos: 0 });
    });

    client.on("message", (_topic, payload) => {
      try {
        const parsed = parsePositionsPayload(JSON.parse(payload.toString("utf8")));
        if (parsed) void applyPlayers(parsed.players);
      } catch {
        // ignore malformed payloads
      }
    });

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      client.end(true);
    };
  }, [huntId, live, mqttInfo]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <TypographyTitle live={live} count={onlineCount} />
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-2xl border border-slate-200"
        style={{ height: 420, width: "100%" }}
      />
    </div>
  );
}

function TypographyTitle({ live, count }: { live: boolean; count: number }) {
  return (
    <p className="m-0 text-sm font-semibold text-slate-800">
      Live hunt location
      {live ? (
        <span className="ml-2 font-normal text-slate-500">
          {count} online player{count === 1 ? "" : "s"}
        </span>
      ) : (
        <span className="ml-2 font-normal text-slate-500">Hunt is not started</span>
      )}
    </p>
  );
}
