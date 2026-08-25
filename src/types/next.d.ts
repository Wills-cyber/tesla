/**
 * Global type declarations for Next.js App Router page/layout props.
 *
 * Next.js 16 doesn't export `PageProps` / `LayoutProps` as generic helpers in
 * the way earlier versions did. These shims make the codebase consistent
 * without relying on `.next/types` being present before a build.
 */

declare global {
  /**
   * Shape of props accepted by an App Router page component.
   *
   * ```ts
   * export default function MyPage({ params }: PageProps<"/items/[id]">) { … }
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type PageProps<_R extends string = string> = {
    params: Promise<Record<string, string>>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  };

  /**
   * Shape of props accepted by an App Router layout component.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type LayoutProps<_R extends string = string> = {
    params: Promise<Record<string, string>>;
    children: React.ReactNode;
  };
}

export {};