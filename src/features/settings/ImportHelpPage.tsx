import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ACCOUNT_SHEETS, JOURNAL_HEADERS } from '../../lib/journalExcel'
import { t } from '../../lib/i18n'
import { Btn, Card, PageHeader } from '../../shared/ui'

export function ImportHelpPage() {
  const { lang } = useApp()

  const steps =
    lang === 'ar'
      ? [
          'نزّل النموذج من دفتر الصندوق (صندوق واحد) أو من الإعدادات (ملف كامل).',
          'افتح ورقة « Instructions » في Excel للتذكير، ثم عبّئ صفوف البيانات تحت صف العناوين « Date ».',
          'تحقق من نوع الصندوق: في النموذج الكامل، كل ورقة = صندوق (انظر الجدول أدناه).',
          'استورد الملف: من الدفتر يُضاف للصندوق الحالي؛ من الإعدادات يُستبدل كل العمليات السابقة.',
          'راجع رسالة الاستيراد؛ أغلق اليوم من الإعدادات عند الحاجة قبل تعديل تواريخ قديمة.',
        ]
      : [
          'Téléchargez le modèle depuis le Journal (un compte) ou Paramètres (fichier complet).',
          'Consultez la feuille « Instructions » dans Excel, puis remplissez les lignes sous l’en-tête « Date ».',
          'Vérifiez le type de caisse : dans le modèle complet, chaque feuille = une caisse (voir le tableau).',
          'Importez : depuis le Journal les lignes s’ajoutent au compte affiché ; depuis Paramètres tout est remplacé.',
          'Lisez le rapport d’import ; clôturez la journée dans Paramètres si une date ne doit plus être modifiée.',
        ]

  const headerLabels =
    lang === 'ar'
      ? [
          ['Date', 'التاريخ — AAAA-MM-JJ أو JJ/MM/AAAA'],
          ['Code', 'رمز اليوم (اختياري)'],
          ['Références', 'الطبيعة: Recettes, Frais, Fournisseurs…'],
          ['Désignations', 'التعيين'],
          ['Détails 01 / 02', 'تفاصيل إضافية'],
          ['Remarques', 'ملاحظات'],
          ['Engagement', 'التزام (نص)'],
          ['Entrées / Sorties', 'مدخول أو مصروف — واحد فقط لكل سطر'],
          ['Soldes', 'يُتجاهل عند الاستيراد'],
        ]
      : [
          ['Date', 'AAAA-MM-JJ, JJ/MM/AAAA ou date Excel'],
          ['Code', 'Numéro du jour (optionnel)'],
          ['Références', 'Nature : Recettes, Frais, Fournisseurs…'],
          ['Désignations', 'Libellé de l’opération'],
          ['Détails 01 / 02', 'Sous-détails'],
          ['Remarques', 'Notes'],
          ['Engagement', 'Texte libre'],
          ['Entrées / Sorties', 'Un seul montant par ligne'],
          ['Soldes', 'Ignoré — solde calculé dans l’app'],
        ]

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('importHelpTitle', lang)}
        description={t('importHelpSubtitle', lang)}
        actions={
          <>
            <Link to="/journal">
              <Btn variant="outline" size="sm">
                {t('journal', lang)}
              </Btn>
            </Link>
            <Link to="/parametres">
              <Btn variant="outline" size="sm">
                {t('settings', lang)}
              </Btn>
            </Link>
          </>
        }
      />

      <Card>
        <h2 className="mb-2 text-sm font-bold">{t('importHelpSteps', lang)}</h2>
        <ol className="list-decimal space-y-2 ps-5 text-sm text-slate-700">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-bold">{t('importHelpWhere', lang)}</h2>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
            <p className="font-semibold text-teal-900">{t('journal', lang)}</p>
            <p className="mt-1 text-slate-600">{t('importHelpJournalMode', lang)}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
            <p className="font-semibold text-amber-950">{t('settings', lang)}</p>
            <p className="mt-1 text-slate-600">{t('importHelpSettingsMode', lang)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-bold">{t('accountType', lang)}</h2>
        <p className="mb-3 text-sm text-slate-600">{t('importHelpAccountMap', lang)}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-start text-xs uppercase text-slate-500">
                <th className="py-2 pe-2">{lang === 'ar' ? 'ورقة Excel' : 'Feuille Excel'}</th>
                <th className="py-2 pe-2">{t('accountType', lang)}</th>
                <th className="py-2">{t('code', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {ACCOUNT_SHEETS.map((s) => (
                <tr key={s.code} className="border-t border-slate-100">
                  <td className="py-1.5 pe-2 font-mono text-xs">{s.sheet}</td>
                  <td className="py-1.5 pe-2">{lang === 'ar' ? s.name_ar : s.name_fr}</td>
                  <td className="py-1.5 font-mono text-xs">{s.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-bold">{t('importHelpColumns', lang)}</h2>
        <p className="mb-2 text-xs text-slate-500">
          {lang === 'ar' ? 'ترتيب الأعمدة:' : 'Ordre des colonnes :'}{' '}
          {JOURNAL_HEADERS.join(' · ')}
        </p>
        <ul className="space-y-1.5 text-sm">
          {headerLabels.map(([col, desc]) => (
            <li key={col}>
              <span className="font-medium">{col}</span>
              <span className="text-slate-600"> — {desc}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-bold">{t('dayClose', lang)}</h2>
        <p className="text-sm text-slate-700">{t('importHelpDayClose', lang)}</p>
      </Card>
    </div>
  )
}
