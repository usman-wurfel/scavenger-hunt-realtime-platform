import { Metadata } from "next";
import Link from "next/link";

import { Box, Button, Paper, Typography } from "@mui/material";

import { buildHuntQrScanUrl } from "@/lib/app-url";
import { formatEventTime12h, isPlayerVisibleActiveHunt } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ScanPageProps = {
  params: Promise<{ eventCode: string }>;
};

export async function generateMetadata({ params }: ScanPageProps): Promise<Metadata> {
  const { eventCode } = await params;
  return {
    title: `Scavenger Hunt · ${eventCode}`,
    description: "Visit this URL in the Scavenger Hunt mobile app after scanning the QR code.",
  };
}

export default async function HuntScanPage({ params }: ScanPageProps) {
  const { eventCode: rawCode } = await params;
  const eventCode = rawCode.trim().toUpperCase();
  const visitUrl = buildHuntQrScanUrl(eventCode);

  const hunt = await prisma.huntEvent.findUnique({
    where: { eventCode },
    select: {
      eventName: true,
      location: true,
      eventDate: true,
      eventTime: true,
      status: true,
    },
  });

  const isActive = hunt ? isPlayerVisibleActiveHunt(hunt) : false;

  return (
    <Box className="flex min-h-screen items-center justify-center p-4">
      <Paper elevation={3} className="bg-background-paper w-full max-w-lg rounded-4xl p-8 sm:p-10">
        <Typography variant="h1" component="h1" className="mb-2 text-center text-2xl">
          Scavenger Hunt
        </Typography>

        {!hunt ? (
          <Box className="flex flex-col gap-4 text-center">
            <Typography variant="body1" className="text-error">
              This hunt QR code is not valid.
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              Ask the organizer for a new QR code.
            </Typography>
          </Box>
        ) : (
          <Box className="flex flex-col gap-4">
            <Typography variant="body1" className="text-center">
              Open this hunt in the Scavenger Hunt mobile app.
            </Typography>

            <Box className="bg-grey-25 rounded-2xl p-4">
              <Typography variant="subtitle2" className="mb-1">
                {hunt.eventName}
              </Typography>
              <Typography variant="body2" className="text-text-secondary">
                {hunt.location}
              </Typography>
              <Typography variant="body2" className="text-text-secondary mt-2">
                {hunt.eventDate.toISOString().slice(0, 10)} · {formatEventTime12h(hunt.eventTime)}
              </Typography>
              {!isActive && (
                <Typography variant="body2" className="text-warning mt-2">
                  This hunt is not active for scanning right now.
                </Typography>
              )}
            </Box>

            <Button
              component={Link}
              href={visitUrl}
              variant="contained"
              color="primary"
              fullWidth
              className="normal-case"
            >
              Visit URL
            </Button>

            <Typography variant="caption" className="text-text-secondary break-all text-center">
              {visitUrl}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
