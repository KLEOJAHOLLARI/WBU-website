import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyCourses from "./tools/list-my-courses";
import getMyTuitionSummary from "./tools/get-my-tuition-summary";
import listMyAnnouncements from "./tools/list-my-announcements";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "wbu-project",
  title: "WBU project",
  version: "0.1.0",
  instructions:
    "Tools for the West Balkan University (WBU) portal. Acts as the signed-in user: read their profile, enrolled courses, tuition balance, and recent announcements.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyCourses, getMyTuitionSummary, listMyAnnouncements],
});
