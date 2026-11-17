"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/client-fetch";
import { inputNoAutofill } from "@/lib/form-autofill";
import { toast } from "@/lib/toast";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

type HuntArea = {
  id: string;
  name: string;
};

export default function AppBroadcastManager() {
  const [message, setMessage] = useState("");
  const [areaId, setAreaId] = useState("");
  const [areas, setAreas] = useState<HuntArea[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;

    void apiFetch("/api/areas")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load areas");
        }
        if (active) setAreas(Array.isArray(data.areas) ? data.areas : []);
      })
      .catch(() => {
        if (active) toast.error("Failed to load areas");
      })
      .finally(() => {
        if (active) setLoadingAreas(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const send = useCallback(async () => {
    const trimmed = message.trim();
    if (!areaId) {
      toast.error("Area is required");
      return;
    }
    if (!trimmed) {
      toast.error("Message is required");
      return;
    }
    if (trimmed.length > 1000) {
      toast.error("Message must be at most 1000 characters");
      return;
    }

    setSending(true);
    try {
      const res = await apiFetch("/api/push/broadcast-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, areaId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to send broadcast");
        return;
      }

      setMessage("");
      toast.success(`Message sent to ${data.area?.name || "selected area"}`);
    } catch {
      toast.error("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  }, [areaId, message]);

  return (
    <Box className="flex flex-col gap-4">
      <Typography variant="h4" component="h1">
        Broadcast by area
      </Typography>

      <Card elevation={0} className="border-grey-100 border">
        <CardContent className="flex flex-col gap-4">
          <TextField
            select
            label="Area"
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
            disabled={sending || loadingAreas}
            helperText={
              loadingAreas
                ? "Loading areas..."
                : "Notification sirf is area ko select karne wale users ko jayegi"
            }
            fullWidth
          >
            {areas.map((area) => (
              <MenuItem key={area.id} value={area.id}>
                {area.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Message"
            placeholder="Type your announcement…"
            multiline
            minRows={4}
            fullWidth
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={sending}
            helperText={`${message.trim().length}/1000`}
            slotProps={{ htmlInput: { ...inputNoAutofill, maxLength: 1000 } }}
          />

          <Button
            variant="contained"
            onClick={() => void send()}
            disabled={sending || loadingAreas || !areaId || !message.trim()}
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ alignSelf: "flex-start" }}
          >
            {sending ? "Sending..." : "Send"}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
