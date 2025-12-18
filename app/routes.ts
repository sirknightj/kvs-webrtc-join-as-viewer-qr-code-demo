import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  route("configure", "routes/configure.tsx"),
  route("view", "routes/view.tsx"),
] satisfies RouteConfig;
