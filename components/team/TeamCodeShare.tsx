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

        {/* WhatsApp Share Button */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Join my team "${team.name}" on DoorStep!\n\nTeam Code: ${team.team_code}\n\nDownload the app and enter this code to join.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          Share via WhatsApp
        </a>

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
