-- Script para remover constraint UNIQUE da coluna EMAIL
-- Executar no servidor 192.168.1.240, database ORIENTE_CUSTOM
-- Permite que o mesmo email seja cadastrado em transportadoras diferentes

USE ORIENTE_CUSTOM;
GO

-- Buscar o nome da constraint UNIQUE
DECLARE @ConstraintName NVARCHAR(255);

SELECT @ConstraintName = kc.name
FROM sys.key_constraints kc
INNER JOIN sys.tables t ON kc.parent_object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'dbo'
  AND t.name = 'ROMANEIOEDI_EMAIL_TRANSPORTADORAS'
  AND kc.type = 'UQ'; -- UQ = UNIQUE constraint

-- Se encontrou a constraint, remover
IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(500);
    SET @SQL = 'ALTER TABLE ORIENTE_CUSTOM.dbo.ROMANEIOEDI_EMAIL_TRANSPORTADORAS DROP CONSTRAINT ' + @ConstraintName;
    
    PRINT 'Removendo constraint: ' + @ConstraintName;
    EXEC sp_executesql @SQL;
    PRINT 'Constraint removida com sucesso!';
END
ELSE
BEGIN
    PRINT 'Nenhuma constraint UNIQUE encontrada na tabela.';
END
GO

-- Verificar se foi removida
SELECT 
    kc.name AS ConstraintName,
    kc.type_desc AS ConstraintType
FROM sys.key_constraints kc
INNER JOIN sys.tables t ON kc.parent_object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'dbo'
  AND t.name = 'ROMANEIOEDI_EMAIL_TRANSPORTADORAS';
GO
