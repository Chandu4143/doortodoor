/**
 * MigrationPrompt Component
 * Shows migration offer when localStorage data is found
 * Requirements: 12.2, 12.4, 12.5
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  CloudUpload, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Building2,
  Briefcase,
  Loader2
} from 'lucide-react';
import Modal from '../ui/Modal';
import {
  hasDataToMigrate,
  getMigrationSummary,
  migrateToSupabase,
  clearLocalStorageData,
  MigrationResult
} from '../../services/supabase/migrationService';

interface MigrationPromptProps {
  teamId: string;
  onMigrationComplete?: (result: MigrationResult) => void;
  onSkip?: () => void;
}

type MigrationState = 'idle' | 'migrating' | 'success' | 'error';

export default function MigrationPrompt({ 
  teamId, 
  onMigrationComplete, 
  onSkip 
}: MigrationPromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>('idle');
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [summary, setSummary] = useState<{
    apartmentCount: number;
    roomCount: number;
    campaignCount: number;
    businessCount: number;
  } | null>(null);

  // Check for localStorage data on mount
  // Requirements: 12.1
  useEffect(() => {
    if (hasDataToMigrate()) {
      setSummary(getMigrationSummary());
      setIsOpen(true);
    }
  }, []);


  // Handle migration
  // Requirements: 12.2
  const handleMigrate = async () => {
    setMigrationState('migrating');
    
    try {
      const migrationResult = await migrateToSupabase(teamId);
      setResult(migrationResult);
      
      if (migrationResult.success) {
        // Requirements: 12.4 - Clear localStorage on success
        clearLocalStorageData();
        setMigrationState('success');
      } else {
        // Requirements: 12.5 - Retain localStorage on failure
        setMigrationState('error');
      }
      
      onMigrationComplete?.(migrationResult);
    } catch (err) {
      setMigrationState('error');
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Migration failed',
      });
    }
  };

  // Handle skip/close
  const handleSkip = () => {
    setIsOpen(false);
    onSkip?.();
  };

  // Handle close after completion
  const handleClose = () => {
    setIsOpen(false);
    if (migrationState === 'success') {
      onMigrationComplete?.(result!);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={migrationState === 'migrating' ? () => {} : handleClose}
      title="Migrate Your Data"
    >
      <AnimatePresence mode="wait">
        {migrationState === 'idle' && summary && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Info message */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  We found existing data stored locally on this device. Would you like to migrate it to your team's cloud storage?
                </p>
              </div>
            </div>

            {/* Data summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Data to migrate:
              </h4>
              
              {(summary.apartmentCount > 0 || summary.roomCount > 0) && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Residential Data
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {summary.apartmentCount} apartment{summary.apartmentCount !== 1 ? 's' : ''}, {summary.roomCount} room{summary.roomCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {(summary.campaignCount > 0 || summary.businessCount > 0) && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Corporate Data
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {summary.campaignCount} campaign{summary.campaignCount !== 1 ? 's' : ''}, {summary.businessCount} business{summary.businessCount !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
              >
                Skip for Now
              </button>
              <button
                onClick={handleMigrate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
              >
                <CloudUpload className="w-4 h-4" />
                Migrate Data
              </button>
            </div>
          </motion.div>
        )}


        {migrationState === 'migrating' && (
          <motion.div
            key="migrating"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-8 space-y-4"
          >
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                Migrating your data...
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Please don't close this window
              </p>
            </div>
          </motion.div>
        )}

        {migrationState === 'success' && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Migration Complete!
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
                Your data has been successfully migrated to the cloud.
              </p>
            </div>

            {/* Migration summary */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{result.migratedApartments || 0}</span> apartment{(result.migratedApartments || 0) !== 1 ? 's' : ''} migrated
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{result.migratedRooms || 0}</span> room{(result.migratedRooms || 0) !== 1 ? 's' : ''} migrated
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{result.migratedCampaigns || 0}</span> campaign{(result.migratedCampaigns || 0) !== 1 ? 's' : ''} migrated
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{result.migratedBusinesses || 0}</span> business{(result.migratedBusinesses || 0) !== 1 ? 'es' : ''} migrated
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
            >
              Continue
            </button>
          </motion.div>
        )}

        {migrationState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Migration Failed
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
                {result?.error || 'An error occurred during migration.'}
              </p>
            </div>

            {/* Warning about data retention */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your local data has been preserved. You can try again later or continue using the app with local storage.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setMigrationState('idle');
                  setResult(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
