"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import countriesData from "@/../public/data/countries.json";

interface CountryInfo {
  name: string;
  idd: string;
  time_zone: string;
  currency_name: string;
  currency: string;
  currency_symbol: string;
}

const partnerTypes = [
  {
    title: "Franchise",
    description:
      "Own and operate a Classypro franchise with full brand support, training, and exclusive territory rights.",
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
      </svg>
    ),
  },
  {
    title: "Dealer",
    description:
      "Become an authorized dealer and sell Classypro products with competitive margins and marketing support.",
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    ),
  },
  {
    title: "Distributor",
    description:
      "Distribute Classypro products across your region with wholesale pricing and logistics support.",
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    title: "Outlet",
    description:
      "Open a Classypro outlet with turnkey setup, showroom design, and ongoing operational guidance.",
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
];

const countryFlags: Record<string, string> = {
  Malaysia: "🇲🇾",
  Singapore: "🇸🇬",
  Indonesia: "🇮🇩",
  Philippines: "🇵🇭",
};

const countrySubdomains: Record<string, string> = {
  Malaysia: "my",
  Singapore: "sg",
  Indonesia: "id",
  Philippines: "ph",
};

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "classypro.online";

function getSubdomainUrl(countryName: string, path: string): string {
  const sub = countrySubdomains[countryName];
  if (!sub) return "#";
  return `https://${sub}.${DOMAIN}${path}`;
}

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState("");
  const countries = countriesData.countries as CountryInfo[];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="https://classy-pro.com/" target="_blank" rel="noopener noreferrer">
            <Image
              src="/images/logo/classy_logo_ori.svg"
              width={180}
              height={50}
              alt="Classypro Logo"
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={selectedCountry ? getSubdomainUrl(selectedCountry, "/auth/signin") : "#"}
              onClick={(e) => {
                if (!selectedCountry) {
                  e.preventDefault();
                  alert("Please select a country first.");
                }
              }}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition ${
                selectedCountry
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-gray-300 text-gray-500"
              }`}
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 pt-28 pb-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute right-10 bottom-10 h-96 w-96 rounded-full bg-indigo-400 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Join Our{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Partnership Program
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-blue-100/80">
            Our partnership model fosters a win-win collaboration. We bring business
            expertise and solutions, while partners contribute resources — creating
            a mutually beneficial relationship for success.
          </p>

          {/* Country Selection */}
          <div className="mx-auto mb-8 max-w-md">
            <label className="mb-3 block text-sm font-medium text-blue-200">
              Select Your Country to Get Started
            </label>
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/20 bg-white/10 px-5 py-4 pr-12 text-lg font-medium text-white backdrop-blur-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              >
                <option value="" className="text-gray-900">
                  Choose a country...
                </option>
                {countries.map((country) => (
                  <option
                    key={country.name}
                    value={country.name}
                    className="text-gray-900"
                  >
                    {countryFlags[country.name] || ""} {country.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {selectedCountry && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-blue-200 backdrop-blur-sm">
              <span className="text-lg">{countryFlags[selectedCountry]}</span>
              <span>
                {selectedCountry} —{" "}
                {countries.find((c) => c.name === selectedCountry)?.currency || ""}{" "}
                ({countries.find((c) => c.name === selectedCountry)?.currency_symbol || ""})
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Partner Types */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Partnership Opportunities
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Choose the partnership model that best fits your goals and resources.
              We provide comprehensive support at every level.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {partnerTypes.map((partner) => (
              <div
                key={partner.title}
                className="group relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:border-blue-300 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  {partner.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">
                  {partner.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {partner.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Why Choose Classypro
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              We stand as a premier kitchen cabinet manufacturer, dedicated to
              transforming culinary spaces with innovative designs and high-quality
              aluminum solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Go Green & Formaldehyde-Free",
                desc: "Manufactured by aluminum alloy. Paintless, formaldehyde-free, antibacterial, safe to humans.",
                icon: "🌿",
              },
              {
                title: "Waterproof & Mildew-proof",
                desc: "Waterproof and moisture-proof to avoid moisture absorption and rotting. Strong quality for better pest control.",
                icon: "💧",
              },
              {
                title: "Stylish & Easy Maintenance",
                desc: "Available in a variety of colours, mimics real wood texture. Easy to maintain, cleaned effortlessly with water.",
                icon: "✨",
              },
              {
                title: "Safe & Durable",
                desc: "Aluminum alloy resists deformation, breaking, rust and decolourization. Soundproof, thermal and fire resistant.",
                icon: "🛡️",
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
                  {item.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              What We Do
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              At Classypro, we offer a seamless and customized experience
              tailored to your unique preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: "Design",
                desc: "We provide an online platform for customers to design and customize their desired products online for an easier and interactive experience.",
                icon: (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                  </svg>
                ),
              },
              {
                title: "Production",
                desc: "From material import to product customization, we handle everything from A to Z for better quality and market competitiveness.",
                icon: (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
                  </svg>
                ),
              },
              {
                title: "Sales",
                desc: "Through our Partnership Program, we integrate resources to deliver excellent products and help partners create huge profit margins.",
                icon: (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 text-center transition hover:shadow-lg"
              >
                <div className="mx-auto mb-4 inline-flex rounded-xl bg-blue-50 p-4 text-blue-600">
                  {item.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Country Locations */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Available Locations
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              We are expanding across Southeast Asia. Select your region to
              explore partnership opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {countries.map((country) => (
              <Link
                key={country.name}
                href={getSubdomainUrl(country.name, "/auth/signin")}
                onClick={() => setSelectedCountry(country.name)}
                className={`rounded-2xl border-2 p-6 text-left transition ${
                  selectedCountry === country.name
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                <div className="mb-3 text-4xl">{countryFlags[country.name]}</div>
                <h3 className="mb-1 text-lg font-bold text-gray-900">
                  {country.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {country.currency} ({country.currency_symbol}) · {country.time_zone}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to Start Your Partnership?
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            Join our growing network of partners across Southeast Asia
            and build a successful business with Classypro.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={selectedCountry ? getSubdomainUrl(selectedCountry, "/auth/signup") : "#"}
              onClick={(e) => {
                if (!selectedCountry) {
                  e.preventDefault();
                  alert("Please select a country first.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-700 shadow-lg transition hover:bg-gray-100"
            >
              Register Now
            </Link>
            <Link
              href="https://classy-pro.com/join-partner/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-gray-400">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <Image
                src="/images/logo/classy_logo_gray.svg"
                width={150}
                height={40}
                alt="Classypro"
                className="mb-4 brightness-200"
              />
              <p className="text-sm leading-relaxed">
                Your go-to for sleek Aluminum Smart Kitchen Cabinets and all-in-one
                kitchen solutions.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="https://classy-pro.com/about-us/" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="https://classy-pro.com/board-of-director/" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                    Board of Director
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">Location</h4>
              <ul className="space-y-2 text-sm">
                {countries.map((c) => (
                  <li key={c.name}>
                    <Link
                      href={getSubdomainUrl(c.name, "/auth/signin")}
                      className="transition hover:text-white"
                    >
                      {countryFlags[c.name]} {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="https://classy-pro.com/join-partner/" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                    Join Partner
                  </Link>
                </li>
                <li>
                  <Link href="https://classy-pro.com/contact-us/" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="https://classy-pro.com/terms-conditions/" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="https://classy-pro.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-800 pt-6 text-center text-sm">
            © {new Date().getFullYear()} Classy Project Marketing Sdn. Bhd. (1299213-T). All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
