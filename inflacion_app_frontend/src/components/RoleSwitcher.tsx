import { useRole } from '../contexts/RoleContext';
import { ChevronDown, Check, Users, UserCog, GraduationCap, Shield, type LucideIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';

interface RoleConfigEntry {
    label: string;
    icon: LucideIcon;
    tagClass: string;
}

const roleConfig: Record<string, RoleConfigEntry> = {
    admin: { label: 'Administrador', icon: Shield, tagClass: 'tag-neutral' },
    monitor: { label: 'Monitor', icon: UserCog, tagClass: 'tag-accent-2' },
    student: { label: 'Estudiante', icon: GraduationCap, tagClass: 'tag-accent' },
};

export const RoleSwitcher = () => {
    const { activeRole, switchRole, hasMultipleRoles, availableRoles } = useRole();

    if (!activeRole) return null;

    const currentConfig = roleConfig[activeRole];
    const CurrentIcon = currentConfig.icon;

    if (!hasMultipleRoles) {
        return (
            <div className={`tag ${currentConfig.tagClass} flex items-center gap-2 px-4 py-2`}>
                <CurrentIcon size={18} />
                <span>{currentConfig.label}</span>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={`tag ${currentConfig.tagClass} flex items-center gap-2 px-4 py-2 cursor-pointer`}>
                    <CurrentIcon size={18} />
                    <span>{currentConfig.label}</span>
                    {availableRoles.length > 1 && (
                        <span className="px-1.5 py-0.5 bg-black/10 rounded text-xs font-bold">
                            +{availableRoles.length - 1}
                        </span>
                    )}
                    <ChevronDown size={16} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted">
                    <Users size={14} />
                    <span className="font-medium">Cambiar rol activo</span>
                </div>
                {availableRoles.map((role) => {
                    const config = roleConfig[role];
                    const Icon = config.icon;
                    const isActive = role === activeRole;

                    return (
                        <DropdownMenuItem
                            key={role}
                            onSelect={() => switchRole(role)}
                            className={`py-2 ${isActive ? 'text-accent-300 font-semibold' : ''}`}
                        >
                            <Icon size={16} />
                            <span className="flex-1">{config.label}</span>
                            {isActive && <Check size={16} />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
