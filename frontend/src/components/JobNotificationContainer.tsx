import React, { useState, useCallback } from 'react';
import JobNotification from './JobNotification';
import './JobNotificationContainer.css';

interface Job {
  id: string;
  jobId: string;
}

const JobNotificationContainer: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);

  // Adicionar novo job para monitorar
  const addJob = useCallback((jobId: string) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setJobs(prev => [...prev, { id, jobId }]);
  }, []);

  // Remover job da lista
  const removeJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(job => job.id !== id));
  }, []);

  // Exportar função para uso global
  React.useEffect(() => {
    // @ts-ignore
    window.addJobNotification = addJob;
    
    return () => {
      // @ts-ignore
      delete window.addJobNotification;
    };
  }, [addJob]);

  return (
    <div className="job-notification-container">
      {jobs.map(job => (
        <JobNotification
          key={job.id}
          jobId={job.jobId}
          onComplete={(result) => {
            console.log('Job completado:', result);
          }}
          onError={(error) => {
            console.error('Job falhou:', error);
          }}
          onClose={() => removeJob(job.id)}
        />
      ))}
    </div>
  );
};

export default JobNotificationContainer;

// Função helper global para adicionar notificação
declare global {
  interface Window {
    addJobNotification: (jobId: string) => void;
  }
}
