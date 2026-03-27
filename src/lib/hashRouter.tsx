import { useEffect, useState, type ReactNode } from "react";

export type RouteConfig = {
  path: string;
  title: string;
  element: ReactNode;
  description?: string;
};

function normalizeHash(hash: string) {
  if (!hash || hash === "#") {
    return "/screens";
  }

  const path = hash.startsWith("#") ? hash.slice(1) : hash;

  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
}

export function hrefFor(path: string) {
  return `#${path}`;
}

export function useHashPath() {
  const [path, setPath] = useState(() => normalizeHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setPath(normalizeHash(window.location.hash));
    };

    window.addEventListener("hashchange", onChange);

    if (!window.location.hash) {
      window.location.hash = hrefFor("/screens");
    }

    return () => {
      window.removeEventListener("hashchange", onChange);
    };
  }, []);

  return path;
}

type RouteLinkProps = {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export function RouteLink({ to, className, children, onClick }: RouteLinkProps) {
  return (
    <a href={hrefFor(to)} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
