import { useSearchParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import PublicTimeClock from "./PublicTimeClock";
import TimeClockPunch from "./TimeClockPunch";

export default function TimeClockEntry() {
  const [params] = useSearchParams();
  return params.has("token") && params.has("point") ? (
    <PublicTimeClock />
  ) : (
    <ProtectedRoute>
      <TimeClockPunch />
    </ProtectedRoute>
  );
}
