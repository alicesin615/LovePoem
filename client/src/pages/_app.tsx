import React, { ReactElement, ReactNode } from "react";
import { NextUIProvider } from "@nextui-org/react";
import "@styles/globals.css";
import type { AppProps } from "next/app";
import { NextPage } from "next";
import { useRouter } from "next/router";
import RootLayout from "@components/layout";

// export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
//   getLayout?: (page: ReactElement) => ReactNode;
// };

// type AppPropsWithLayout = AppProps & {
//   Component: NextPageWithLayout;
// };

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <NextUIProvider navigate={router.push}>
      <Component {...pageProps} />
    </NextUIProvider>
  );
}
