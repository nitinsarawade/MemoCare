import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { guidanceService } from '../../api';
import { Card, Button, LoadingState, ErrorState } from '../../components/ui/primitives';

export default function TutorialDetailPage() {
  const { slug } = useParams();
  const qc = useQueryClient();
  const [completing, setCompleting] = useState(false);
  const { data: article, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tutorial', slug],
    queryFn: () => guidanceService.getBySlug(slug),
  });

  const markComplete = async () => {
    setCompleting(true);
    try {
      await guidanceService.complete(article.id);
      qc.invalidateQueries({ queryKey: ['tutorials-progress'] });
      refetch();
    } finally {
      setCompleting(false);
    }
  };

  if (isLoading) return <LoadingState rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!article) return null;

  return (
    <div>
      <Link to="/guidance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={14} /> All tutorials
      </Link>
      <Card style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>{article.title}</h1>
        {article.videoUrl && (
          <div style={{ margin: '16px 0' }}>
            <video controls style={{ width: '100%', borderRadius: 10 }} src={article.videoUrl} />
          </div>
        )}
        <div className="markdown-body">
          <ReactMarkdown>{article.bodyMarkdown || article.body || ''}</ReactMarkdown>
        </div>
        <Button onClick={markComplete} loading={completing} variant={article.completed ? 'secondary' : 'primary'} style={{ marginTop: 20 }}>
          <CheckCircle2 size={15} /> {article.completed ? 'Completed' : 'Mark as complete'}
        </Button>
      </Card>
    </div>
  );
}
