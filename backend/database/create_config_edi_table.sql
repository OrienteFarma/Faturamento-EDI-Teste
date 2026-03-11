/*
  IMPORTANTE: Este script deve ser executado no servidor Sankhya (192.168.3.63)
  Banco de dados: SANKHYA_PROD
  
  Use as mesmas credenciais do banco principal
*/

-- Tabela de configuração de EDI por transportadora
CREATE TABLE ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    COD_TRANSPORTADORA INT NOT NULL,
    NOME_ABREVIADO VARCHAR(20) NOT NULL,
    TIPO_LAYOUT VARCHAR(20) NOT NULL, -- 'VER002', 'OUTRO_LAYOUT', etc
    GERA_ARQUIVO_EDI INT DEFAULT 1, -- 1 = Sim, 0 = Não
    ATIVO INT DEFAULT 1,
    DATA_CRIACAO DATETIME DEFAULT GETDATE(),
    DATA_ALTERACAO DATETIME DEFAULT GETDATE()
);

-- Índice para busca rápida
CREATE INDEX IDX_CONFIG_TRANSP ON ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS(COD_TRANSPORTADORA, ATIVO);

-- Inserir configuração para transportadora 25211
INSERT INTO ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS 
    (COD_TRANSPORTADORA, NOME_ABREVIADO, TIPO_LAYOUT, GERA_ARQUIVO_EDI, ATIVO)
VALUES 
    (25211, 'TRANSP25211', 'VER002', 1, 1);

-- Comentários nas colunas
EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Código da transportadora' , 
    @level0type=N'SCHEMA',@level0name=N'dbo', 
    @level1type=N'TABLE',@level1name=N'ROMANEIOEDI_CONFIG_TRANSPORTADORAS', 
    @level2type=N'COLUMN',@level2name=N'COD_TRANSPORTADORA';

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Nome abreviado usado no nome do arquivo EDI' , 
    @level0type=N'SCHEMA',@level0name=N'dbo', 
    @level1type=N'TABLE',@level1name=N'ROMANEIOEDI_CONFIG_TRANSPORTADORAS', 
    @level2type=N'COLUMN',@level2name=N'NOME_ABREVIADO';

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Tipo de layout do arquivo EDI (VER002, etc)' , 
    @level0type=N'SCHEMA',@level0name=N'dbo', 
    @level1type=N'TABLE',@level1name=N'ROMANEIOEDI_CONFIG_TRANSPORTADORAS', 
    @level2type=N'COLUMN',@level2name=N'TIPO_LAYOUT';
