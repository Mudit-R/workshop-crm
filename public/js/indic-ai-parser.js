/**
 * Vortex ERP - Precision CNC & 3D Prototyping Workshop Management
 * Indic AI Parser & Voice Notes Backward Compatibility Shim
 */
(function() {
  if (typeof window !== 'undefined') {
    if (window.VortexVoiceNotes) {
      window.VortexIndicAiParser = window.VortexVoiceNotes;
    }
  }
})();
