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
INSERT INTO linktype (type, back, acyclic) VALUES ('blocks', 'blocked-by', 1);
INSERT INTO linktype (type, back, acyclic) VALUES ('related-to', 'related-to', 0);

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

CREATE TRIGGER check_no_cycles BEFORE INSERT ON link
WHEN (SELECT acyclic FROM linktype WHERE type = NEW.type)
BEGIN
    SELECT RAISE(ABORT, 'cycle detected')
    WHERE NEW.a = NEW.b OR EXISTS (
        WITH RECURSIVE r AS (
            SELECT b FROM link WHERE a = NEW.b AND type = NEW.type
            UNION ALL
            SELECT link.b FROM link JOIN r ON link.a = r.b WHERE link.type = NEW.type
        ) SELECT 1 FROM r WHERE r.b = NEW.a LIMIT 1
    );
END;
