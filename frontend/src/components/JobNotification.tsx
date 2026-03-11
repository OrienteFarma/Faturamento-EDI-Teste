import React, { useEffect, useState } from 'react';
import { JobStatus, JobMonitor } from '../services/jobService';
import './JobNotification.css';

interface JobNotificationProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

const JobNotification: React.FC<JobNotificationProps> = ({ 
  jobId, 
  onComplete, 
  onError,
  onClose 
}) => {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [monitor, setMonitor] = useState<JobMonitor | null>(null);

  useEffect(() => {
    // Cria monitor para o job
    const jobMonitor = new JobMonitor(
      jobId,
      // onUpdate
      (newStatus) => {
        setStatus(newStatus);
      },
      // onComplete
      (result) => {
        if (onComplete) {
          onComplete(result);
        }
        // Auto-fechar após 5 segundos
        setTimeout(() => onClose(), 5000);
      },
      // onError
      (error) => {
        if (onError) {
          onError(error);
        }
        // Auto-fechar após 10 segundos
        setTimeout(() => onClose(), 10000);
      }
    );

    jobMonitor.start();
    setMonitor(jobMonitor);

    // Cleanup
    return () => {
      jobMonitor.stop();
    };
  }, [jobId]);

  if (!status) {
    return null;
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '📋';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'pending':
        return 'Na fila...';
      case 'processing':
        return 'Processando...';
      case 'completed':
        return 'Concluído!';
      case 'failed':
        return 'Falhou';
      default:
        return 'Aguardando';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'completed':
        return '#059669';
      case 'failed':
        return '#dc2626';
      case 'processing':
        return '#2563eb';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="job-notification" style={{ borderLeftColor: getStatusColor() }}>
      <div className="job-notification-header">
        <span className="job-notification-icon">{getStatusIcon()}</span>
        <div style={{ flex: 1 }}>
          <span className="job-notification-title">{getStatusText()}</span>
          {(status.transportadora || status.result?.transportadora) && (
            <div style={{ fontSize: '0.85em', opacity: 0.9, marginTop: '2px' }}>
              {status.transportadora || status.result?.transportadora}
            </div>
          )}
        </div>
        <button className="job-notification-close" onClick={onClose}>×</button>
      </div>

      <div className="job-notification-body">
        {status.status === 'processing' && (
          <>
            <div className="job-notification-progress">
              <div 
                className="job-notification-progress-bar"
                style={{ 
                  width: `${status.progress}%`,
                  backgroundColor: getStatusColor()
                }}
              />
              <span className="job-notification-progress-text">{status.progress}%</span>
            </div>
          </>
        )}

        {status.status === 'completed' && status.result && (
          <div className="job-notification-result">
            {status.result.transportadora && (
              <p style={{ fontWeight: 600, marginBottom: '8px' }}>
                {status.result.transportadora}
              </p>
            )}
            <p>📧 {status.result.emailsEnviados || 0} email(s) enviado(s)</p>
            <p>📄 {status.result.pdfsGerados || 0} PDF(s) gerado(s)</p>
            {status.result.ediGerado && <p>📋 Arquivo EDI gerado</p>}
          </div>
        )}

        {status.status === 'failed' && status.error && (
          <div className="job-notification-error">
            <p>{status.error}</p>
          </div>
        )}

        <div className="job-notification-meta">
          <small>Job ID: {status.id.substring(0, 12)}...</small>
        </div>
      </div>
    </div>
  );
};

export default JobNotification;
