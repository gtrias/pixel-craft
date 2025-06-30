import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { PixelArtConverter } from "./PixelArtConverter";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 relative overflow-hidden">
      {/* Retro grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid-pattern"></div>
      </div>
      
      {/* Vintage scanlines */}
      <div className="scanlines"></div>
      
      <header className="relative z-10 flex justify-between items-center p-6 border-b-2 border-amber-800/20">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-800 border-4 border-amber-900 flex items-center justify-center pixel-border">
            <span className="text-amber-100 font-bold text-xl pixel-font">P</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-amber-900 pixel-font tracking-wider">PIXELCRAFT</h1>
            <div className="text-xs text-amber-700 pixel-font">EST. 1985</div>
          </div>
        </div>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>

      <main className="relative z-10 px-6 pb-12">
        <Content />
      </main>
      
      <Toaster 
        theme="light" 
        toastOptions={{
          style: {
            background: '#fbbf24',
            color: '#92400e',
            border: '2px solid #92400e',
            fontFamily: 'monospace'
          }
        }}
      />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="retro-loader">
          <div className="loader-text pixel-font text-amber-800">LOADING...</div>
          <div className="loader-bar">
            <div className="loader-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Authenticated>
        <div className="text-center mb-12 mt-8">
          <h2 className="text-6xl font-bold text-amber-900 mb-4 pixel-font tracking-wider retro-shadow">
            PIXEL CONVERTER
          </h2>
          <div className="inline-block bg-amber-200 border-2 border-amber-800 px-6 py-3 pixel-border">
            <p className="text-lg text-amber-800 pixel-font">
              Transform your images into authentic 8-bit masterpieces
            </p>
          </div>
        </div>
        <PixelArtConverter />
      </Authenticated>

      <Unauthenticated>
        <div className="text-center mb-12 mt-8">
          <h2 className="text-6xl font-bold text-amber-900 mb-6 pixel-font tracking-wider retro-shadow">
            RETRO ARCADE
          </h2>
          <div className="inline-block bg-amber-200 border-2 border-amber-800 px-6 py-3 pixel-border mb-8">
            <p className="text-lg text-amber-800 pixel-font">
              Insert coin to continue • Sign in to start your pixel journey
            </p>
          </div>
        </div>
        
        <div className="max-w-md mx-auto">
          <div className="bg-amber-100 border-4 border-amber-800 pixel-border p-8">
            <div className="text-center mb-6">
              <div className="text-2xl pixel-font text-amber-800 mb-2">PLAYER LOGIN</div>
              <div className="w-full h-1 bg-amber-800"></div>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
