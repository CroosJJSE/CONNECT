import { createContext, useContext, type ReactNode } from 'react';

const MemberLevelContext = createContext<Record<string, number>>({});

export function MemberLevelProvider({
  levelsByUserId,
  children,
}: {
  levelsByUserId: Record<string, number>;
  children: ReactNode;
}) {
  return (
    <MemberLevelContext.Provider value={levelsByUserId}>
      {children}
    </MemberLevelContext.Provider>
  );
}

export function useMemberLevels(): Record<string, number> {
  return useContext(MemberLevelContext);
}
