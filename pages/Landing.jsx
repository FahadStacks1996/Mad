import React, { useState } from "react";
import { FaWhatsapp, FaMapMarkerAlt, FaFacebookF, FaInstagram } from "react-icons/fa";

const Landing = () => {
  const [waHover, setWaHover] = useState(false);
  const [locHover, setLocHover] = useState(false); // <-- Add this line

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }}>
      {/* Main Content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        position: "relative"
      }}>
        {/* Centered Logo and Button */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "-80px"
        }}>
          <img
            src="/Images/madpizzalogo.png"
            alt="Mad Pizza Logo"
            style={{ height: 170, marginBottom: 0 }}
          />
          <button
            onClick={() => window.location.href = '/customer'}
            style={{
              marginTop: 80,
              background: "#fa8922",
              color: "#fff",
              border: "none",
              borderRadius: 30,
              padding: "18px 48px",
              fontSize: "1.3rem",
              fontWeight: 700,
              boxShadow: "0 4px 16px rgba(250,137,34,0.18)",
              cursor: "pointer",
              transition: "background 0.18s"
            }}
          >
            Order Now
          </button>
        </div>
        {/* Remove Customer Login Modal */}
      </div>
      {/* Footer */}
      <footer style={{
        width: "100%",
        background: "#fa8922",
        color: "#fff",
        minHeight: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "1rem",
        padding: "0 32px"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <a
            href="https://wa.me/923210444333"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: waHover ? "#128C7E" : "#ffff",
              textDecoration: "none",
              fontWeight: 500,
              transition: "color 0.2s"
            }}
            onMouseEnter={() => setWaHover(true)}
            onMouseLeave={() => setWaHover(false)}
          >
            <FaWhatsapp style={{ fontSize: 20, color: waHover ? "#128C7E" : "#25D366", transition: "color 0.2s" }} />
            +92-321-0444333
          </a>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 15
        }}>
          <a
            href="https://www.google.com/maps/dir//Plot+C+22,+Block+2+Clifton,+Karachi,+Pakistan/@24.8148393,67.0149235,20z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3eb33d90bea879cb:0xabe9842fa87822d6!2m2!1d67.0153971!2d24.8148393?entry=ttu&g_ep=EgoyMDI1MDYwMS4wIKXMDSoASAFQAw%3D%3D"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 15,
              color: locHover ? "#128C7E" : "#fff",
              textDecoration: "none",
              fontWeight: 500,
              transition: "color 0.2s"
            }}
            onMouseEnter={() => setLocHover(true)}
            onMouseLeave={() => setLocHover(false)}
          >
            <FaMapMarkerAlt style={{ fontSize: 20, color: locHover ? "#128C7E" : "#fff", transition: "color 0.2s" }} />
            <span>C-22, Block-2, Lane 5, Kehkashan, Clifton, Karachi</span>
          </a>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 18
        }}>
          <FaFacebookF style={{ fontSize: 22, color: "#fff" }} />
          <FaInstagram style={{ fontSize: 22, color: "#fff" }} />
          <span style={{ fontWeight: 500 }}>madpizza.pk</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;