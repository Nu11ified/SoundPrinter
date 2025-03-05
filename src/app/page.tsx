"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="relative w-full max-w-4xl space-y-12 rounded-2xl bg-white/5 p-12 backdrop-blur-xl">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="space-y-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl font-bold text-white sm:text-6xl"
          >
            Audio Fingerprint
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto max-w-2xl text-lg text-white/70"
          >
            Advanced audio recognition technology that helps you identify and match sounds with precision.
          </motion.p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href="/record">
              <div className="group relative overflow-hidden rounded-xl bg-white/10 p-6 transition-all hover:bg-white/15">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">Record Audio →</h3>
                    <div className="rounded-full bg-purple-500/20 p-2">
                      <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg text-white/70">
                    Record or upload audio to create a fingerprint. Save it with a name for later identification.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href="/identify">
              <div className="group relative overflow-hidden rounded-xl bg-white/10 p-6 transition-all hover:bg-white/15">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">Identify Audio →</h3>
                    <div className="rounded-full bg-indigo-500/20 p-2">
                      <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg text-white/70">
                    Record a short audio clip to identify matching fingerprints in the database.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex justify-center space-x-4 text-sm text-white/50"
        >
          <span>Fast</span>
          <span>•</span>
          <span>Accurate</span>
          <span>•</span>
          <span>Secure</span>
        </motion.div>
      </div>
    </main>
  );
}
