
import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, Download } from 'lucide-react';
import { parseCSV, importBuildings, type ImportError, type CSVBuildingData } from '../services/supabase/importService';
import { cn } from '../utils/cn';

interface CSVImportModalProps {
    teamId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CSVImportModal({ teamId, onClose, onSuccess }: CSVImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<CSVBuildingData[]>([]);
    const [errors, setErrors] = useState<ImportError[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (selectedFile: File) => {
        setFile(selectedFile);
        setIsParsing(true);
        setErrors([]);
        setParsedData([]);

        const text = await selectedFile.text();
        const { data, errors: parseErrors } = parseCSV(text);

        setParsedData(data);
        setErrors(parseErrors);
        setIsParsing(false);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        const result = await importBuildings(teamId, parsedData);
        if (result.success) {
            alert(`Successfully imported ${result.createdCount} buildings!`);
            onSuccess();
            onClose();
        } else {
            // Append import errors to validation errors
            setErrors(prev => [...prev, ...result.errors]);
            alert(`Import completed with ${result.errors.length} errors. Imported ${result.createdCount} buildings successfully.`);
            // Don't close, let them see errors
        }
        setIsImporting(false);
    };

    const downloadTemplate = () => {
        const headers = "name,floors,units_per_floor,target_amount,latitude,longitude\n";
        const sample = "Sunshine Apartments,4,4,50000,12.9716,77.5946\nGreen Valley,10,6,100000,12.9279,77.6271";
        const blob = new Blob([headers + sample], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "campaign_import_template.csv";
        a.click();
    };

    return (
        <div className="space-y-6">
            {!file ? (
                // Upload State
                <div
                    className={cn(
                        "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer",
                        dragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                    />
                    <Upload className="w-12 h-12 text-slate-400 mb-4" />
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Drag & Drop CSV File</p>
                    <p className="text-sm text-slate-500 mb-6">or click to browse</p>

                    <button
                        onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                        className="flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium"
                    >
                        <Download size={14} /> Download Template
                    </button>
                </div>
            ) : (
                // Preview State
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-slate-800 dark:text-white">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <button onClick={() => setFile(null)} className="text-sm text-red-500 hover:underline">Change</button>
                    </div>

                    {isParsing ? (
                        <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin" />
                            Parsing file...
                        </div>
                    ) : (
                        errors.length > 0 ? (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                                <div className="flex items-center gap-2 font-bold mb-2">
                                    <AlertTriangle size={18} />
                                    Found {errors.length} errors
                                </div>
                                <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                                    {errors.map((err, idx) => (
                                        <li key={idx}>Row {err.row}: {err.message}</li>
                                    ))}
                                </ul>
                                {parsedData.length > 0 && (
                                    <p className="mt-3 text-sm font-medium">
                                        Note: {parsedData.length} valid rows can still be imported.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-xl border border-green-100 dark:border-green-900/30 flex items-center gap-2">
                                <CheckCircle size={18} />
                                <span className="font-bold">Ready to import {parsedData.length} buildings</span>
                            </div>
                        )
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={parsedData.length === 0 || isImporting}
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isImporting ? <Loader2 className="animate-spin" size={18} /> : null}
                            {isImporting ? 'Importing...' : 'Start Import'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
