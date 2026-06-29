'use client'
import "../styles/index.scss";
import { Provider } from "react-redux";
import store from "@/redux/store";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <html lang="en" suppressHydrationWarning={isDev}>
      <head>
        <meta name="keywords" content="seller portal, real estate, home selling, agent matching" />
        <meta
          name="description"
          content="Settled is a seller-guided property portal built on the Hozn frontend and reworked for Vercel deployment."
        />
        <meta property="og:site_name" content="Settled" />
        <meta property="og:url" content="https://settled.vercel.app" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Settled Seller Portal" />
        <meta property="og:image" content="/assets/images/logo/settled-logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Settled Seller Portal" />
        <meta name="twitter:image" content="/assets/images/logo/settled-logo.png" />
        {/* For IE  */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* For Resposive Device */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* For Window Tab Color */}
        {/* Chrome, Firefox OS and Opera */}
        <meta name="theme-color" content="#0D1A1C" />
        {/* Windows Phone */}
        <meta name="msapplication-navbutton-color" content="#0D1A1C" />
        {/* iOS Safari */}
        <meta name="apple-mobile-web-app-status-bar-style" content="#0D1A1C" />
        <link rel="icon" href="/assets/images/logo/settled-logo.png" sizes="any" />
        <link rel="apple-touch-icon" href="/assets/images/logo/settled-logo.png" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap" />
      </head>
      <body suppressHydrationWarning={true}>
        <div className="main-page-wrapper">
          <Provider store={store}>
            {children}
          </Provider>
        </div>
      </body>
    </html>
  )
}
