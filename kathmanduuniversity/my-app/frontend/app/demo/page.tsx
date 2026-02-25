// my-app/frontend/app/demo/page.tsx

"use client";
// import './globals.css';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaWheelchair,
  FaUserFriends,
  FaBaby,
  FaWalking,
  FaArrowLeft,
  FaChevronRight,
  FaClock,
  FaStar,
  FaAccessibleIcon
} from "react-icons/fa";
import { MdElderlyWoman } from "react-icons/md";
import { FaPersonWalkingWithCane } from "react-icons/fa6";
import { MdChildFriendly } from "react-icons/md";

import css from 'styled-jsx/css';
export default function DemoPage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const navigationModes = [
    {
      id: "wheelchair",
      title: "Wheelchair User",
      description: "Navigate with wheelchair-accessible routes",
      icon: <FaWheelchair className="w-12 h-12" />,
      color: "from-orange-500 to-amber-500",
      bgColor: "bg-orange-50",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      status: "available",
      buttonText: "Start Navigation",
      phase: "Now Available"
    },
    {
      id: "elderly",
      title: "Elderly / Senior Citizen",
      description: "Find easy-access paths with ramps",
      icon: < MdElderlyWoman className="w-12 h-12" />,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      status: "phase2",
      buttonText: "Coming in Phase 2",
      phase: "Coming Soon"
    },
    {
      id: "stroller",
      title: "Parent with Stroller",
      description: "Stroller-friendly routes and paths",
      icon: <MdChildFriendly className="w-12 h-12" />,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      status: "phase2",
      buttonText: "Coming in Phase 2",
      phase: "Coming Soon"
    },
    {
      id: "mobility",
      title: "Mobility Assistance",
      description: "Routes for walkers and crutches",
      icon: <FaPersonWalkingWithCane className="w-12 h-12" />,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      status: "phase2",
      buttonText: "Coming in Phase 2",
      phase: "Coming Soon"
    }
  ];

  const handleStartNavigation = (modeId: string) => {
    if (modeId === "wheelchair") {
      router.push('../maps');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"
          style={{ left: '10%', top: '20%' }}
        ></div>
        <div 
          className="absolute w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float animation-delay-2000"
          style={{ right: '10%', bottom: '20%' }}
        ></div>
        <div 
          className="absolute w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float animation-delay-4000"
          style={{ left: '20%', bottom: '10%' }}
        ></div>
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-300 rounded-full opacity-20 animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back button with animation */}
        <Link 
          href="/" 
          className="inline-flex items-center text-gray-600 hover:text-orange-500 transition-all duration-300 group mb-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-orange-100 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 -z-10 rounded-full"></div>
          <FaArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
          <span>Back to Home</span>
        </Link>

        {/* Header with animations */}
        <div className="text-center mb-12 animate-slide-down">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 relative inline-block">
            Demo Selection
            <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-orange-500 rounded-full animate-width-pulse"></span>
          </h1>
          <p className="text-xl text-gray-600 animate-fade-in animation-delay-200">
            Choose Your Navigation Mode
          </p>
          <p className="text-gray-500 mt-2 animate-fade-in animation-delay-400">
            Select the navigation type that best suits your needs
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {navigationModes.map((mode, index) => (
            <div
              key={mode.id}
              className={`group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden
                ${hoveredCard === mode.id ? 'scale-105' : 'scale-100'}
                ${mode.status === 'phase2' ? 'opacity-80 hover:opacity-100' : ''}
              `}
              onMouseEnter={() => setHoveredCard(mode.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                animation: `slide-up 0.6s ease-out ${index * 0.1}s forwards`,
                opacity: 0,
                transform: 'translateY(20px)'
              }}
            >
              {/* Animated gradient border */}
              <div className={`absolute inset-0 bg-gradient-to-r ${mode.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
              
              {/* Status badge */}
              <div className="absolute top-4 right-4 z-10">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                  ${mode.status === 'available' 
                    ? 'bg-green-100 text-green-700 animate-pulse-gentle' 
                    : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  <FaClock className="mr-1 w-3 h-3" />
                  {mode.phase}
                </span>
              </div>

              {/* Card content */}
              <div className="p-8 relative">
                {/* Icon with animation */}
                <div className="mb-6 relative">
                  <div className={`absolute inset-0 ${mode.iconBg} rounded-2xl transform rotate-3 group-hover:rotate-6 transition-transform duration-500`}></div>
                  <div className={`relative w-20 h-20 ${mode.iconBg} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 ${mode.iconColor}`}>
                    {mode.icon}
                  </div>
                  
                  {/* Floating particles around icon */}
                  <div className={`absolute -top-2 -right-2 w-8 h-8 ${mode.iconBg} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-ping-slow`}></div>
                  <div className={`absolute -bottom-2 -left-2 w-6 h-6 ${mode.iconBg} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-ping-slow animation-delay-500`}></div>
                </div>

                {/* Text content */}
                <h2 className={`text-2xl font-bold text-gray-900 mb-2 group-hover:translate-x-1 transition-transform duration-300
                  ${mode.status === 'available' ? 'group-hover:text-orange-600' : ''}`}
                >
                  {mode.title}
                </h2>
                <p className="text-gray-600 mb-6 group-hover:translate-x-1 transition-transform duration-300 delay-75">
                  {mode.description}
                </p>

                {/* Features preview */}
                <div className="space-y-2 mb-6">
                  {mode.id === 'wheelchair' && (
                    <>
                      <div className="flex items-center text-sm text-gray-500 group-hover:translate-x-2 transition-transform duration-300">
                        <FaStar className="w-4 h-4 text-orange-500 mr-2" />
                        <span>Step-free routes</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 group-hover:translate-x-2 transition-transform duration-300 delay-75">
                        <FaStar className="w-4 h-4 text-orange-500 mr-2" />
                        <span>Ramp availability</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 group-hover:translate-x-2 transition-transform duration-300 delay-150">
                        <FaStar className="w-4 h-4 text-orange-500 mr-2" />
                        <span>Obstacle alerts</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Button */}
                <button
                  onClick={() => handleStartNavigation(mode.id)}
                  disabled={mode.status !== 'available'}
                  className={`w-full py-4 px-6 rounded-xl text-white font-semibold transition-all duration-500 relative overflow-hidden group/btn
                    ${mode.status === 'available'
                      ? `bg-gradient-to-r ${mode.color} hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-1`
                      : 'bg-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {mode.buttonText}
                    {mode.status === 'available' && (
                      <FaChevronRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-2 transition-transform duration-300" />
                    )}
                  </span>
                  {mode.status === 'available' && (
                    <div className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500"></div>
                  )}
                </button>

                {/* Progress indicator for coming soon */}
                {mode.status === 'phase2' && (
                  <div className="mt-4">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gray-400 to-gray-500 w-0 group-hover:w-1/3 transition-all duration-1000"></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">In development</p>
                  </div>
                )}
              </div>

              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-orange-200 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-tl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-orange-200 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-br-3xl"></div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center animate-fade-in animation-delay-1000">
          <div className="inline-flex items-center space-x-2 text-gray-500 text-sm group cursor-default">
            <span className="relative">
              <FaAccessibleIcon className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
            </span>
            <span>Made with</span>
            <span className="text-orange-500 font-semibold relative">
              {/* Emergent */}
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></span>
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes width-pulse {
          0%, 100% { width: 6rem; opacity: 1; }
          50% { width: 8rem; opacity: 0.7; }
        }
        .animate-width-pulse {
          animation: width-pulse 2s ease-in-out infinite;
        }

        @keyframes pulse-gentle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-gentle {
          animation: pulse-gentle 2s ease-in-out infinite;
        }

        @keyframes ping-slow {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes particle {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translate(var(--tx, 100px), var(--ty, -100px)) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-particle {
          --tx: ${() => (Math.random() - 0.5) * 200}px;
          --ty: ${() => (Math.random() - 0.5) * 200}px;
          animation: particle 8s linear infinite;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-400 {
          animation-delay: 400ms;
        }

        .animation-delay-500 {
          animation-delay: 500ms;
        }

        .animation-delay-1000 {
          animation-delay: 1000ms;
        }

        .animation-delay-2000 {
          animation-delay: 2000ms;
        }

        .animation-delay-4000 {
          animation-delay: 4000ms;
        }
      `}</style>
    </div>
  );
}