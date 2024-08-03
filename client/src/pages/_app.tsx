import React, { ReactElement, ReactNode } from "react";
import { NextUIProvider } from "@nextui-org/react";
import "@styles/globals.css";
import type { AppProps } from "next/app";
import { NextPage } from "next";
import { useRouter } from "next/router";

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();

  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <NextUIProvider navigate={router.push}>
      {getLayout(<Component {...pageProps} />)}
    </NextUIProvider>
  );
}
