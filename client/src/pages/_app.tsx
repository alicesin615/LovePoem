import React from "react";
import { NextUIProvider } from "@nextui-org/react";
import "@styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import RootLayout from "@components/layout";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <NextUIProvider navigate={router.push}>
      <RootLayout>
        <Component {...pageProps} />
      </RootLayout>
    </NextUIProvider>
  );
}
