-- Up
CREATE TABLE Autoplaylists (Name TEXT, URLs TEXT);
INSERT INTO Autoplaylists (Name, URLs) VALUES ("Default", "");

-- Down
DROP TABLE Autoplaylists;
