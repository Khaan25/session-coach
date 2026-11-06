import { Container } from "@/components/app/container";
import { MeasuredSkeleton } from "@/components/app/measured-suspense";
import { DeviceSection } from "@/components/setup/device-section";
import { SetupSteps } from "@/components/setup/setup-steps";
import { SetupView } from "@/components/setup/setup-view";

// Shown while the route itself loads: the page's own fallbacks, the unmarked steps and the devices skeleton. Only the
// skeleton's shape comes from these rows: two computers, one never used.
export default function SetupLoading() {
  return (
    <Container>
      <SetupView
        steps={<SetupSteps />}
        devices={
          <MeasuredSkeleton label="Loading your devices">
            <DeviceSection
              initialTokens={[
                {
                  id: "sample-0",
                  label: "sams-mbp (macOS)",
                  created: "3 days ago",
                  lastUsed: "2 hours ago",
                },
                {
                  id: "sample-1",
                  label: "home-desktop (Linux)",
                  created: "2 weeks ago",
                  lastUsed: null,
                },
              ]}
            />
          </MeasuredSkeleton>
        }
      />
    </Container>
  );
}
