import { useEffect, useRef } from 'react';

const SITE_NAME = 'MemoCare';

/**
 * Set <title> and the meta description for the current page without
 * pulling in a dependency like react-helmet. Renders nothing.
 *
 *   useDocumentMeta({ title: 'Dashboard', description: '...' })
 */
export function useDocumentMeta({ title, description }) {
  const prev = useRef(null);

  useEffect(() => {
    if (!prev.current) prev.current = document.title;

    if (title) document.title = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

    if (description) {
      let el = document.querySelector('meta[name="description"]');
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', 'description');
        document.head.appendChild(el);
      }
      prev.currentDesc = el.content;
      el.content = description;
    }

    return () => {
      if (prev.current) document.title = prev.current;
      if (prev.currentDesc !== undefined) {
        const el = document.querySelector('meta[name="description"]');
        if (el) el.content = prev.currentDesc;
      }
    };
  }, [title, description]);
}
