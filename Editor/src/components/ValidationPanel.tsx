import React from 'react';
import { ValidationError } from '../types';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';

interface ValidationPanelProps {
  errors: ValidationError[];
  onClose: () => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  errors,
  onClose
}) => {
  const getErrorIcon = (type: ValidationError['type']) => {
    switch (type) {
      case 'missing_asset':
        return <AlertTriangle size={16} className="error-icon missing-asset" />;
      case 'invalid_connection':
        return <AlertTriangle size={16} className="error-icon invalid-connection" />;
      case 'missing_choice':
        return <AlertTriangle size={16} className="error-icon missing-choice" />;
      case 'invalid_fork':
        return <AlertTriangle size={16} className="error-icon invalid-fork" />;
      default:
        return <AlertTriangle size={16} className="error-icon" />;
    }
  };

  const getErrorTypeLabel = (type: ValidationError['type']) => {
    switch (type) {
      case 'missing_asset':
        return 'Missing Asset';
      case 'invalid_connection':
        return 'Invalid Connection';
      case 'missing_choice':
        return 'Missing Choice';
      case 'invalid_fork':
        return 'Invalid Fork';
      default:
        return 'Error';
    }
  };

  const getErrorSeverity = (type: ValidationError['type']) => {
    switch (type) {
      case 'missing_asset':
        return 'warning';
      case 'invalid_connection':
        return 'error';
      case 'missing_choice':
        return 'error';
      case 'invalid_fork':
        return 'error';
      default:
        return 'error';
    }
  };

  if (errors.length === 0) {
    return null;
  }

  const errorCount = errors.filter(e => getErrorSeverity(e.type) === 'error').length;
  const warningCount = errors.filter(e => getErrorSeverity(e.type) === 'warning').length;

  return (
    <div className="validation-panel">
      <div className="validation-header">
        <div className="validation-title">
          <h3>Validation Results</h3>
          <div className="validation-summary">
            {errorCount > 0 && (
              <span className="error-count">{errorCount} errors</span>
            )}
            {warningCount > 0 && (
              <span className="warning-count">{warningCount} warnings</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
      </div>

      <div className="validation-content">
        {errors.map((error, index) => (
          <div 
            key={index} 
            className={`validation-item ${getErrorSeverity(error.type)}`}
          >
            <div className="validation-icon">
              {getErrorIcon(error.type)}
            </div>
            <div className="validation-details">
              <div className="validation-type">
                {getErrorTypeLabel(error.type)}
              </div>
              <div className="validation-message">
                {error.message}
              </div>
              {error.nodeId && (
                <div className="validation-node">
                  Node: {error.nodeId}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="validation-footer">
        <div className="validation-actions">
          {errorCount === 0 ? (
            <div className="validation-success">
              <CheckCircle size={16} />
              <span>No critical errors found. Your show is ready to export!</span>
            </div>
          ) : (
            <div className="validation-errors">
              <AlertTriangle size={16} />
              <span>Please fix the errors above before exporting.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
