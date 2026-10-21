import type { Metadata } from "next";
import { SwaggerDocs } from "./SwaggerDocs";

export const metadata: Metadata = {
  title: "API docs",
  robots: { index: false, follow: false },
};

export default function DocsPage() {
  return <SwaggerDocs />;
}
