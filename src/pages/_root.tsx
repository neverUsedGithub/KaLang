import { useEffect, useState } from "react";
import "./_root.scss";
import { Outlet, Link, useLocation } from "react-router-dom";
import HamburgerIcon from "../icons/Hamburger";

export default function App() {
  const [width, setWidth] = useState(window.innerWidth);
  const location = useLocation();
  const routes = [
    { path: "/", name: "Home" },
    { path: "/syntax", name: "Syntax Reference" },
    { path: "/playground", name: "Playground" },
  ];
  const useHamburger = width < 550;
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    setNavCollapsed(true);
  }, [location]);

  useEffect(() => {
    function resizeListener() {
      setWidth(window.innerWidth);
    }

    window.addEventListener("resize", resizeListener);

    return () => {
      window.removeEventListener("resize", resizeListener);
    };
  }, []);

  return (
    <>
      <nav className="app-nav">
        <div className="content">
          <Link to="/" className="nav-title">
            KaLang
          </Link>
          {!useHamburger && (
            <>
              {routes.map((r) => (
                <Link
                  to={r.path}
                  key={r.path}
                  className={`nav-item${
                    location.pathname === r.path ? " current" : ""
                  }`}
                >
                  {r.name}
                </Link>
              ))}
            </>
          )}
          {useHamburger && (
            <button
              className="hamburger-button"
              onClick={() => setNavCollapsed(!navCollapsed)}
            >
              <HamburgerIcon width={16} height={16} />
            </button>
          )}
        </div>
      </nav>
      {useHamburger && !navCollapsed && (
        <div className="nav-items-floating">
          {routes.map((r) => (
            <Link
              to={r.path}
              key={r.path}
              className={`nav-item${
                location.pathname === r.path ? " current" : ""
              }`}
            >
              {r.name}
            </Link>
          ))}
        </div>
      )}
      <Outlet />
    </>
  );
}
