// Côté serveur uniquement (utilise le DNS de Node).
import { promises as dns } from 'node:dns';

/**
 * Vérifie que le domaine d'une adresse peut recevoir des e-mails (MX, sinon A).
 * Renvoie false seulement quand le DNS dit clairement que le domaine n'existe
 * pas. En cas de doute (délai dépassé, panne DNS), on ne bloque pas.
 */
export async function domaineRecoitEmails(email: string): Promise<boolean> {
  const domaine = email.split('@')[1]?.trim().toLowerCase();
  if (!domaine) return false;
  const avecDelai = <T,>(p: Promise<T>) =>
    Promise.race([
      p,
      new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })), 4000)),
    ]);
  const inexistant = (e: unknown) => {
    const code = (e as { code?: string })?.code;
    return code === 'ENOTFOUND' || code === 'ENODATA';
  };
  try {
    const mx = await avecDelai(dns.resolveMx(domaine));
    if (mx.length > 0) return true;
  } catch (e) {
    if (!inexistant(e)) return true;
  }
  try {
    const a = await avecDelai(dns.resolve4(domaine));
    return a.length > 0;
  } catch (e) {
    return !inexistant(e);
  }
}
