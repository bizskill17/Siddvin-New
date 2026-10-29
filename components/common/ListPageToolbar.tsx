import React from 'react';

interface ListPageToolbarProps {
  title: string;
  leadingAction?: React.ReactNode;
  children: React.ReactNode;
}

const ListPageToolbar: React.FC<ListPageToolbarProps> = ({ title, leadingAction, children }) => (
  <div className="sidvin-list-toolbar">
    <div className="sidvin-list-toolbar-heading">
      {leadingAction}
      <h1 className="sidvin-list-toolbar-title">{title}</h1>
    </div>
    <div className="sidvin-list-toolbar-controls">{children}</div>
  </div>
);

export default ListPageToolbar;
