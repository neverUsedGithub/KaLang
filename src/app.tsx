import "./app.scss";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./pages/_root.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "./pages/404";
import IndexPage from "./pages/index";
import PlaygroundPage from "./pages/Playground";
import SyntaxReferencePage from "./pages/SyntaxReference";

const router = createBrowserRouter([
  {
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <IndexPage /> },
      { path: "/playground", element: <PlaygroundPage /> },
      { path: "/syntax", element: <SyntaxReferencePage /> },
    ],
  },
], {
  basename: "/KaLang/"
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
