// Champs de formulaire accessibles (recette du 10/11/2026, A11Y-02). Le message d'erreur ou
// d'aide est rendu par <Field> avec l'id `${id}-error` ou `${id}-hint`.
/**
 * Attributs d'un champ relié à son <Field> (WCAG 3.3.1 et 3.3.3, RGAA 11.10) : le lecteur d'écran
 * annonce l'erreur ou l'aide du champ, et l'état « invalide ».
 */
export function fieldAria(id: string, error?: unknown, hint?: unknown) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return {
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': describedBy,
  };
}

/** Place le focus sur le premier champ en erreur, dans l'ordre du formulaire. */
export function focusFirstInvalid(ids: string[], errors: Record<string, unknown>) {
  const first = ids.find((id) => errors[id]);
  if (first) document.getElementById(first)?.focus();
}
