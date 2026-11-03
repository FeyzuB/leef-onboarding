import type { HelpContact } from '@prisma/client';
import { LifeBuoy, Mail, Pencil, Phone, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { addHelpContact, deleteHelpContact, moveHelpContact, updateHelpContact } from '@/app/actions/guides';
import { Drawer } from '@/components/Drawer';
import { MoveButtons, iconButtonClass } from '@/components/MoveButtons';
import { AddForm, ConfirmButton, SubmitButton } from '@/components/forms';
import { Field, inputClass, smallButtonClass } from '@/components/ui';

/** An e-mail address becomes a mailto link, a phone number a tel link; anything else stays text. */
function ContactValue({ value }: { value: string }) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return (
      <a href={`mailto:${value}`} className="inline-flex items-center gap-1 break-all font-medium text-brand-700 hover:underline">
        <Mail size={13} className="shrink-0" /> {value}
      </a>
    );
  }
  if (/^[+\d][\d\s()–-]{6,}$/.test(value)) {
    return (
      <a href={`tel:${value.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
        <Phone size={13} className="shrink-0" /> {value}
      </a>
    );
  }
  return <span className="font-medium text-slate-800">{value}</span>;
}

function ContactFields({ contact }: { contact?: HelpContact }) {
  return (
    <div className="space-y-4">
      <Field label="For" hint="e.g. Problems with your laptop or phone">
        <input name="topic" required maxLength={120} defaultValue={contact?.topic} className={inputClass} />
      </Field>
      <Field label="Contact" hint="An e-mail address or phone number becomes clickable">
        <input name="contact" required maxLength={200} defaultValue={contact?.contact} className={inputClass} />
      </Field>
      <Field label="Note">
        <input name="note" maxLength={300} defaultValue={contact?.note} placeholder="e.g. 038 – 8520006, 24/7" className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="urgent" defaultChecked={contact?.urgent} className="accent-brand-600" />
        Urgent (shown first, in red), e.g. a security incident
      </label>
    </div>
  );
}

/** "Need help?": who to contact for what. On the Guides page and behind the help button in the sidebar. */
export function HelpContacts({ contacts, canEdit = false }: { contacts: HelpContact[]; canEdit?: boolean }) {
  const ordered = [...contacts].sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.position - b.position);
  return (
    <div>
      {ordered.length === 0 ? (
        <p className="text-sm text-slate-500">No contacts yet.</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((contact) => (
            <li
              key={contact.id}
              className={`group relative flex items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ${
                contact.urgent ? 'bg-red-50 ring-red-200' : 'bg-white ring-slate-200/80'
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  contact.urgent ? 'bg-white text-red-600 ring-1 ring-red-200' : 'bg-brand-50 text-brand-600 ring-1 ring-brand-100'
                }`}
              >
                {contact.urgent ? <ShieldAlert size={16} /> : <LifeBuoy size={16} />}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className={`font-semibold ${contact.urgent ? 'text-red-800' : 'text-slate-900'}`}>{contact.topic}</p>
                <ContactValue value={contact.contact} />
                {contact.note && <p className={`mt-0.5 text-xs ${contact.urgent ? 'text-red-700' : 'text-slate-500'}`}>{contact.note}</p>}
              </div>
              {canEdit && (
                <div className="absolute right-1.5 top-1.5 flex items-center rounded-lg bg-white/95 opacity-100 shadow-sm ring-1 ring-slate-200 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  <MoveButtons action={moveHelpContact} fields={{ contactId: contact.id }} />
                  <Drawer
                    key={[contact.topic, contact.contact, contact.note, contact.urgent].join('|')}
                    title="Edit contact"
                    triggerClassName={iconButtonClass}
                    triggerLabel="Edit contact"
                    trigger={<Pencil size={14} />}
                  >
                    <form action={updateHelpContact} className="space-y-4">
                      <input type="hidden" name="contactId" value={contact.id} />
                      <ContactFields contact={contact} />
                      <SubmitButton>Save</SubmitButton>
                    </form>
                  </Drawer>
                  <form action={deleteHelpContact}>
                    <input type="hidden" name="contactId" value={contact.id} />
                    <ConfirmButton
                      message={`Remove “${contact.topic}”?`}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} aria-label="Remove contact" />
                    </ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="mt-3">
          <Drawer
            key={`contacts-${contacts.length}`}
            title="Add a contact"
            triggerClassName={smallButtonClass}
            trigger={
              <>
                <Plus size={14} /> Add contact
              </>
            }
          >
            <AddForm action={addHelpContact} className="space-y-4">
              <ContactFields />
              <SubmitButton>Add contact</SubmitButton>
            </AddForm>
          </Drawer>
        </div>
      )}
    </div>
  );
}
