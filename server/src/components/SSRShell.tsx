import type { FC, Child } from 'hono/jsx';
import { NavBar } from './NavBar';

export interface OGMetadata {
  title: string;
  description?: string;
  type?: string;
  image?: string;
  url?: string;
}

export interface SSRShellProps {
  title: string;
  og?: OGMetadata;
  components?: Child[];
  children?: Child;
  wrapInAppContainer?: boolean;
  currentPath?: string;
  showNav?: boolean;
}

export const SSRShell: FC<SSRShellProps> = ({
  title,
  og,
  components,
  children,
  wrapInAppContainer = true,
  currentPath,
  showNav = true,
}) => {
  const content = (
    <>
      {components}
      {children}
    </>
  );

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {og?.title && <meta property="og:title" content={og.title} />}
        {og?.description && <meta property="og:description" content={og.description} />}
        {og?.type && <meta property="og:type" content={og.type} />}
        {og?.image && <meta property="og:image" content={og.image} />}
        {og?.url && <meta property="og:url" content={og.url} />}
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        {wrapInAppContainer ? (
          <div class="app-container">
            {showNav && <NavBar currentPath={currentPath} />}
            {content}
          </div>
        ) : (
          <>
            {showNav && <NavBar currentPath={currentPath} />}
            {content}
          </>
        )}
      </body>
    </html>
  );
};
