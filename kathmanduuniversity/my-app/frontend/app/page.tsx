// my-app/frontend/app/page.tsx

"use client";
// import styles from './globals.css';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FaWheelchair, 
  FaBell, 
  FaUsers, 
  FaDownload,
  FaMapMarkedAlt,
  FaChevronRight,
  FaStar,
  FaQuoteRight,
  FaArrowDown
} from "react-icons/fa";

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  


      const heroRef = useRef<HTMLDivElement>(null);
      const featuresRef = useRef<HTMLDivElement>(null);
      const pricingRef = useRef<HTMLDivElement>(null);
      const testimonialsRef = useRef<HTMLDivElement>(null);
      const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      // Update active section for navbar highlighting
      const sections = [
        { id: "hero", ref: heroRef },
        { id: "features", ref: featuresRef },
        { id: "pricing", ref: pricingRef },
        { id: "testimonials", ref: testimonialsRef },
        { id: "cta", ref: ctaRef }
      ];
      
      for (const section of sections) {
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    // Intersection Observer for fade-in animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // Observe all sections
    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const features = [
    {
      icon: <FaMapMarkedAlt className="w-7 h-7" />,
      title: "Smart Route Planning",
      description: "AI-powered navigation that automatically detects and suggests wheelchair-accessible routes with minimal obstacles."
    },
    {
      icon: <FaBell className="w-7 h-7" />,
      title: "Real-Time Alerts",
      description: "Get instant notifications about construction, temporary obstacles, or accessibility issues on your route."
    },
    {
      icon: <FaUsers className="w-7 h-7" />,
      title: "Community Powered",
      description: "Help others by reporting accessibility features and obstacles. Build a better map together."
    },
    {
      icon: <FaDownload className="w-7 h-7" />,
      title: "Offline Access",
      description: "Download maps for offline use. Navigate even without internet connection."
    }
  ];

  const testimonials = [
    {
      initials: "RK",
      name: "Rajesh Kumar",
      role: "Wheelchair User, Kathmandu",
      quote: "AccessPath has transformed how I navigate the city. I can finally plan my routes with confidence.",
      color: "bg-orange-100",
      rating: 5
    },
    {
      initials: "SS",
      name: "Sita Sharma",
      role: "Caregiver",
      quote: "This app saves me so much time. I know exactly which routes are accessible before we leave home.",
      color: "bg-amber-100",
      rating: 5
    },
    {
      initials: "BT",
      name: "Bikash Thapa",
      role: "Accessibility Advocate",
      quote: "Finally, a navigation solution designed for accessibility. The community features are brilliant!",
      color: "bg-orange-100",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(249,115,22,0.05),transparent_50%)] animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(249,115,22,0.05),transparent_50%)] animate-pulse-slow animation-delay-1000"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float animation-delay-2000"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg py-2 translate-y-0' 
          : 'bg-white/90 backdrop-blur-sm shadow-md py-4'
      }`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            {/* Logo with bounce animation */}
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-orange-500 rounded-lg transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 animate-soft-bounce">
                <FaWheelchair className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900 group-hover:text-orange-500 transition-colors duration-300">AccessPath</span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {['Features', 'Pricing', 'Testimonials'].map((item, index) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className={`relative group transition-all duration-500 ${
                    activeSection === item.toLowerCase() 
                      ? 'text-orange-500' 
                      : 'text-gray-700 hover:text-orange-500'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="text-sm font-medium">{item}</span>
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-orange-500 transition-all duration-300 ${
                    activeSection === item.toLowerCase() ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </Link>
              ))}
              <button 
                onClick={() => router.push('/demo')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-1 hover:scale-105 animate-pulse-gentle"
              >
                Try Demo
              </button>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden text-gray-600 hover:text-orange-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} id="hero" className="relative pt-36 pb-20 px-6 min-h-screen flex items-center">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 -left-4 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 -right-4 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Animated icon */}
          <div className="inline-block mb-6 animate-float">
            <div className="p-4 bg-orange-500 rounded-2xl shadow-xl shadow-orange-200/50 hover:shadow-2xl hover:shadow-orange-300/50 transition-shadow duration-500">
              <FaWheelchair className="w-10 h-10 text-white animate-spin-slow" />
            </div>
          </div>

          {/* Animated title */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 animate-slide-down">
            Your Journey, Made{' '}
            <span className="text-orange-500 relative inline-block">
              Accessible
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-orange-500 rounded-full animate-width-pulse"></span>
            </span>
          </h1>

          {/* Animated description */}
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in animate-delay-200">
            AccessPath revolutionizes navigation for wheelchair users across Nepal. Find the most accessible routes, avoid obstacles, and travel with complete confidence.
          </p>

          {/* Animated buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <button
              onClick={() => router.push('/options')}
              className="group bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full text-base font-medium transition-all duration-500 hover:shadow-2xl hover:shadow-orange-200 hover:-translate-y-2 hover:scale-105 flex items-center justify-center"
            >
              Start Free Demo
              <FaChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
            </button>
            <Link
              href="#pricing"
              className="group border-2 border-orange-500 text-orange-500 hover:bg-orange-50 px-8 py-3 rounded-full text-base font-medium transition-all duration-500 hover:-translate-y-2 hover:scale-105 hover:shadow-xl flex items-center justify-center"
            >
              View Pricing
            </Link>
          </div>

          {/* Animated stats */}
          <div className="mt-12 relative animate-scale-in">
            <div className="inline-block bg-linear-to-b from-orange-500 to-amber-500 px-8 py-4 rounded-full shadow-xl shadow-orange-200/50 hover:shadow-2xl hover:shadow-orange-300/50 transition-all duration-500 hover:scale-105">
              <p className="text-white font-semibold text-lg">500+ Active Users</p>
              <p className="text-white/90 text-xs">Navigating Nepal Daily</p>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
            <FaArrowDown className="w-6 h-6 text-orange-500" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className="py-20 bg-linear-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12 animate-on-scroll">
            <span className="text-orange-500 font-semibold text-sm uppercase tracking-wider">Features</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-4">Everything You Need to Navigate</h2>
            <p className="text-gray-600 text-lg">Powerful features designed specifically for accessibility and ease of use</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 hover:scale-105 cursor-pointer border border-gray-100 animate-on-scroll"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="mb-4 p-3 bg-orange-100 rounded-xl inline-block group-hover:bg-orange-500 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <div className="text-orange-500 group-hover:text-white transition-colors duration-500">
                    {feature.icon}
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-500 transition-colors duration-300">
                  {feature.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:translate-x-2">
                  <span className="text-orange-500 text-sm font-medium inline-flex items-center">
                    Learn more <FaChevronRight className="ml-1 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} id="pricing" className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-gray-50 to-white"></div>
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="animate-on-scroll">
            <span className="text-orange-500 font-semibold text-sm uppercase tracking-wider">Pricing</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-4">Simple, Affordable Pricing</h2>
            <p className="text-gray-600 text-lg mb-12">Start navigating accessible routes today</p>
          </div>

          <div className="max-w-md mx-auto animate-on-scroll">
            <div className="group bg-white rounded-3xl p-8 border-2 border-orange-200 hover:border-orange-500 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 hover:scale-105">
              <div className="mb-6 animate-pulse-gentle">
                <span className="text-xs font-semibold text-orange-500 bg-orange-100 px-3 py-1 rounded-full">Most Popular</span>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">Premium Access</h4>
              <p className="text-gray-600 text-sm mb-6">Full access to all features</p>
              <div className="mb-6">
                <span className="text-5xl font-extrabold text-gray-900">NPR 400</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="text-left space-y-4 mb-8">
                {[
                  "Real-time accessible route navigation",
                  "Wheelchair-friendly path detection",
                  "Obstacle alerts and warnings",
                  "Community-reported accessibility updates",
                  "Save favorite accessible locations"
                ].map((item, i) => (
                  <li key={i} className="flex items-start text-sm text-gray-700 group-hover:translate-x-2 transition-all duration-500" style={{ transitionDelay: `${i * 100}ms` }}>
                    <span className="text-orange-500 mr-3 font-bold transform group-hover:scale-125 transition-transform">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push('/options')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 rounded-xl text-sm font-medium transition-all duration-500 hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-2 hover:scale-105"
              >
                Start Free Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsRef} id="testimonials" className="py-20 bg-linear-to-b from-white to-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 animate-on-scroll">
            <span className="text-orange-500 font-semibold text-sm uppercase tracking-wider">Testimonials</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-4">Loved by Our Community</h2>
            <p className="text-gray-600 text-lg">See what our users are saying about AccessPath</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 hover:scale-105 relative animate-on-scroll"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <FaQuoteRight className="absolute top-4 right-4 w-8 h-8 text-orange-200 group-hover:text-orange-300 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12" />
                
                <div className="flex items-center mb-4">
                  <div className={`w-16 h-16 rounded-2xl ${testimonial.color} flex items-center justify-center mr-4 group-hover:scale-110 transition-all duration-500 group-hover:rotate-6 group-hover:shadow-lg`}>
                    <span className="text-orange-600 font-bold text-xl group-hover:scale-110 transition-transform">{testimonial.initials}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-orange-500 transition-colors duration-300">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                    <div className="flex mt-1">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className="w-4 h-4 text-yellow-400 animate-pulse-gentle" style={{ animationDelay: `${i * 100}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 italic relative z-10 group-hover:text-gray-900 transition-colors">"{testimonial.quote}"</p>
                <div className="mt-4 h-1 w-0 group-hover:w-full bg-orange-500 transition-all duration-700"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} id="cta" className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-orange-500 to-amber-500 opacity-90 animate-gradient"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-ping-slow"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-ping-slow animation-delay-1000"></div>
        </div>
        
        <div className="max-w-3xl mx-auto text-center relative animate-on-scroll">
          <h2 className="text-4xl font-bold text-white mb-4 animate-slide-down">Ready to Navigate with Confidence?</h2>
          <p className="text-white/90 text-lg mb-8 animate-fade-in animate-delay-200">
            Join hundreds of users who are exploring Nepal with accessibility in mind
          </p>
          <button
            onClick={() => router.push('/options')}
            className="group bg-white text-orange-500 hover:bg-orange-50 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:scale-110 inline-flex items-center animate-pulse-gentle"
          >
            Start Your Free Demo
            <FaChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(249,115,22,0.3),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 animate-on-scroll">
              <div className="flex items-center space-x-2 mb-4 group">
                <div className="p-2 bg-orange-500 rounded-lg transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                  <FaWheelchair className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors duration-300">AccessPath</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Making navigation accessible for everyone in Nepal. Navigate with confidence, travel without barriers.
              </p>
            </div>

            {/* Quick Links */}
            <div className="animate-on-scroll" style={{ animationDelay: '100ms' }}>
              <h4 className="text-sm font-semibold text-white mb-4 relative inline-block">
                Quick Links
                <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-orange-500 animate-width-pulse"></span>
              </h4>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Testimonials', 'Demo'].map((item, i) => (
                  <li key={item}>
                    <Link 
                      href={`#${item.toLowerCase()}`}
                      className="text-sm text-gray-400 hover:text-orange-400 transition-all duration-300 hover:translate-x-2 inline-block"
                      style={{ transitionDelay: `${i * 50}ms` }}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div className="animate-on-scroll" style={{ animationDelay: '200ms' }}>
              <h4 className="text-sm font-semibold text-white mb-4 relative inline-block">
                Support
                <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-orange-500 animate-width-pulse"></span>
              </h4>
              <ul className="space-y-2">
                {['Help Center', 'Contact Us', 'Privacy Policy'].map((item, i) => (
                  <li key={item}>
                    <Link 
                      href="#"
                      className="text-sm text-gray-400 hover:text-orange-400 transition-all duration-300 hover:translate-x-2 inline-block"
                      style={{ transitionDelay: `${i * 50}ms` }}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Made with */}
            <div className="animate-on-scroll" style={{ animationDelay: '300ms' }}>
              <h4 className="text-sm font-semibold text-white mb-4 relative inline-block">
                Made with
                <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-orange-500 animate-width-pulse"></span>
              </h4>
              <div className="group">
                <p className="text-sm text-gray-400 group-hover:text-orange-400 transition-colors duration-300 cursor-default animate-pulse-gentle">
                  <span className="text-orange-500 inline-block group-hover:scale-125 transition-transform">❤️</span> 
                </p>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-800 mt-8 pt-8 text-center animate-on-scroll">
            <p className="text-xs text-gray-500">© 2024 AccessPath. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.8s ease-out;
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.6s ease-out;
        }
        
        @keyframes width-pulse {
          0%, 100% { width: 2rem; opacity: 1; }
          50% { width: 4rem; opacity: 0.7; }
        }
        .animate-width-pulse {
          animation: width-pulse 2s ease-in-out infinite;
        }
        
        @keyframes ping-slow {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        @keyframes pulse-gentle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-gentle {
          animation: pulse-gentle 2s ease-in-out infinite;
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        @keyframes soft-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-soft-bounce {
          animation: soft-bounce 2s ease-in-out infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 10s ease infinite;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
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
        
        .animate-on-scroll {
          opacity: 0;
        }
        
        .animate-on-scroll.animate-fade-in-up {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}