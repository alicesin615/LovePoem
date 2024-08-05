import MainNavbar from "@components/main-navbar";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body className="min-h-screen bg-background relative">
        <MainNavbar />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
