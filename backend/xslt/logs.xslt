<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes"/>
  <xsl:template match="/logs">
    <div class="xml-output">
      <h3>📋 Activity Logs (XSLT Transformed)</h3>
      <table class="xslt-table">
        <thead>
          <tr><th>ID</th><th>Action</th><th>Actor</th><th>Detail</th><th>Timestamp</th></tr>
        </thead>
        <tbody>
          <xsl:for-each select="log">
            <tr>
              <td><xsl:value-of select="@id"/></td>
              <td><xsl:value-of select="action"/></td>
              <td><xsl:value-of select="actor"/></td>
              <td><xsl:value-of select="detail"/></td>
              <td><xsl:value-of select="timestamp"/></td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </div>
  </xsl:template>
</xsl:stylesheet>
