// Simple test to verify the shared ExportLoader functionality
import { ExportLoader } from './exportLoader';

// Test that the ExportLoader class is properly exported and has the expected methods
console.log('Testing ExportLoader...');

if (typeof ExportLoader !== 'function') {
  throw new Error('ExportLoader is not a constructor function');
}

if (typeof ExportLoader.loadExportedShow !== 'function') {
  throw new Error('ExportLoader.loadExportedShow is not a function');
}

if (typeof ExportLoader.loadShowFromFile !== 'function') {
  throw new Error('ExportLoader.loadShowFromFile is not a function');
}

if (typeof ExportLoader.validateExportFile !== 'function') {
  throw new Error('ExportLoader.validateExportFile is not a function');
}

console.log('✅ ExportLoader has all required methods');
console.log('✅ Shared export loader test passed');
