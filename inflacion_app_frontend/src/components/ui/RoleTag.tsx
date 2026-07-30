const styles: Record<string, string> = {
    admin: 'tag-neutral',
    monitor: 'tag-accent-2',
    student: 'tag-accent',
    superadmin: 'tag-outline',
};

export const RoleTag = ({ role }: { role: string }) => {
    return <span className={`tag ${styles[role] || 'tag-neutral'}`}>{role}</span>;
};
