import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./NotFound.css";

const NotFound = () => {
  return (
    <div className="not-found">
      <div className="not-found__glow" aria-hidden />
      <p className="not-found__brand">Beatify</p>
      <h1 className="not-found__code">404</h1>
      <p className="not-found__copy">This page doesn’t exist.</p>
      <Link to="/" className="not-found__home">
        <ArrowLeft size={18} strokeWidth={2.2} aria-hidden />
        Go back home
      </Link>
    </div>
  );
};

export default NotFound;
