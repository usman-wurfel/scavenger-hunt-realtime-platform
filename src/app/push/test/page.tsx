"use client";

import { useMemo, useState } from "react";

import { Box, Button, TextField, Typography } from "@mui/material";

const DEFAULT_FCM_TOKEN =
  "YOUR_FCM_DEVICE_TOKEN";

export default function PushTestPage() {
  const [fcmToken, setFcmToken] = useState(DEFAULT_FCM_TOKEN);
  const [title, setTitle] = useState("Scavenger Hunt Test");
  const [body, setBody] = useState("Direct test notification from backend.");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testUrl = useMemo(() => {
    const params = new URLSearchParams({
      fcmToken,
      title,
      body,
      type: "test",
    });
    return `/api/push/test?${params.toString()}`;
  }, [fcmToken, title, body]);

  async function handleSend() {
    setLoading(true);
    setResult("");

    try {
      const response = await fetch(testUrl);
      const json = await response.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="mx-auto max-w-3xl px-6 py-8">
      <Typography variant="h4" component="h1" className="mb-2 font-bold">
        Push Notification Test
      </Typography>
      <Typography variant="body2" className="text-text-secondary mb-6">
        Sirf development / APP_DEBUG=true par kaam karta hai.
      </Typography>

      <Box className="flex flex-col gap-4">
        <TextField
          label="FCM Token"
          value={fcmToken}
          onChange={(event) => setFcmToken(event.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth />
        <TextField label="Body" value={body} onChange={(event) => setBody(event.target.value)} fullWidth />
        <TextField label="Test URL" value={testUrl} fullWidth multiline minRows={2} InputProps={{ readOnly: true }} />
        <Button variant="contained" onClick={handleSend} disabled={loading || !fcmToken.trim()}>
          {loading ? "Sending..." : "Send Test Notification"}
        </Button>
        {result ? (
          <Box component="pre" className="overflow-auto rounded border p-4 text-sm">
            {result}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
