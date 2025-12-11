/**
 * TeamCodeShare Component
 * Displays team code for sharing with QR code generation and copy functionality
 * Requirements: 21.1, 21.2, 21.3
 */

import React, { useState, useMemo } from 'react';
import { Copy, Check, QrCode, Share2 } from 'lucide-react';
import { type Team } from '../../services/supabase/teamService';
import { cn } from '../../utils/cn';
import Modal from '../ui/Modal';

interface TeamCodeShareProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
}

/**
 * Generates a QR code URL using a public QR code API
 * The QR code contains the team code for easy scanning
 */
function generateQRCodeURL(data: string, size: number = 250): string {
  // Using QR Server API (free, no API key required)
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&format=png&margin=10`;
}

export default function TeamCodeShare({ isOpen, onClose, team }: TeamCodeShareProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);

  // Generate QR code URL for the team code
  const qrCodeUrl = useMemo(() => {
    return generateQRCodeURL(team.team_code, 250);
  }, [team.team_code]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(team.team_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = team.team_code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle native share if available
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${team.name}`,
          text: `Join my team "${team.name}" using this code: ${team.team_code}`,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Team Code">
      <div className="space-y-6">
        {/* Team Info */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {team.name}
          </h3>
          {team.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {team.description}
            </p>
          )}
        </div>

        {/* Instructions */}
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Share this code with others to let them join your team.
          They can scan the QR code or enter the code manually.
        </p>

        {/* QR Code Toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowQR(!showQR)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              showQR
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            )}
          >
            <QrCode size={16} />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>
        </div>

        {/* QR Code Display */}
        {showQR && (
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <img
                src={qrCodeUrl}
                alt={`QR Code for team ${team.name}`}
                className="w-[250px] h-[250px]"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* Team Code Display */}
        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl">
          <p className="text-xs uppercase text-slate-400 font-bold mb-2 text-center">
            Team Code
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-center">
              <span className="text-2xl font-mono font-bold tracking-wider text-slate-800 dark:text-slate-100">
                {team.team_code}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "p-3 rounded-lg font-bold transition-colors",
                copied
                  ? "bg-green-500 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
              title={copied ? 'Copied!' : 'Copy to clipboard'}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        {/* Share Button (for mobile) */}
        {'share' in navigator && (
          <button
            onClick={handleShare}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Share Team Code
          </button>
        )}

        {/* Copy Button (fallback for desktop) */}
        {!('share' in navigator) && (
          <button
            onClick={handleCopy}
            className={cn(
              "w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2",
              copied
                ? "bg-green-500 text-white"
                : "bg-purple-600 text-white hover:bg-purple-700"
            )}
          >
            {copied ? (
              <>
                <Check size={18} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy Team Code
              </>
            )}
          </button>
        )}

        {/* Help Text */}
        <p className="text-xs text-slate-400 text-center">
          New members will join as Team Members. You can change their role after they join.
        </p>
      </div>
    </Modal>
  );
}
