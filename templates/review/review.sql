INSERT OR IGNORE INTO itemtype(type) VALUES ('requirement');
INSERT OR IGNORE INTO itemstatus(status) VALUES ('submitted');
INSERT OR IGNORE INTO linktype(type, back, acyclic) VALUES ('satisfies', 'satisfied-by', 0);
