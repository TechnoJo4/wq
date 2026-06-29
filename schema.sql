CREATE TABLE itemtype(type TEXT PRIMARY KEY NOT NULL) STRICT;
INSERT INTO itemtype (type) VALUES ('task');

CREATE TABLE item(
    id INTEGER PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (type) REFERENCES itemtype (type)
) STRICT;
CREATE INDEX item_status ON item(status, type);

CREATE TABLE linktype(type TEXT PRIMARY KEY NOT NULL, back TEXT NOT NULL, acyclic INTEGER NOT NULL) STRICT;
INSERT INTO linktype (type, back) VALUES ('blocks', 'blocked-by'); -- a blocks b / b blocked by a

CREATE TABLE link(
    type TEXT NOT NULL,
    a INTEGER NOT NULL,
    b INTEGER NOT NULL,
    PRIMARY KEY (a, type, b),
    FOREIGN KEY (type) REFERENCES linktype (type),
    FOREIGN KEY (a) REFERENCES item (id),
    FOREIGN KEY (b) REFERENCES item (id)
) STRICT;
CREATE INDEX backlinks ON link(b, type, a);
