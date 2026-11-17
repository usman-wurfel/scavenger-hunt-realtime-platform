"use client";

import { useEffect, useState } from "react";

export default function InitialLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div id="initial-loader">
      <div className="spinner" />
    </div>
  );
}
