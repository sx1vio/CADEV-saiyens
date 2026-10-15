import { Flag } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorText } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/overlay';
import { Field, Textarea } from '@/components/ui/primitives';
import { api, type Report } from '@/services';

/** M1 : signalement. */
export function ReportSheet({
  target,
  onClose,
}: {
  target: { type: Report['targetType']; id: string; label: string } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  return (
    <Sheet
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      title={target?.type === 'user' ? t('common.reportUserTitle') : t('common.reportTitle')}
      size="sm"
      footer={
        <Button
          variant="danger"
          icon={<Flag />}
          disabled={reason.trim().length < 3}
          onClick={async () => {
            if (!target) return;
            try {
              await api.report(target.type, target.id, target.label, reason);
              toast.success(t('common.reportSent'));
              setReason('');
              onClose();
            } catch (e) {
              toast.error(errorText(t, e));
            }
          }}
        >
          {t('common.report')}
        </Button>
      }
    >
      <Field label={t('common.reportReason')} htmlFor="report-reason">
        <Textarea
          id="report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('common.reportPlaceholder')}
        />
      </Field>
    </Sheet>
  );
}
