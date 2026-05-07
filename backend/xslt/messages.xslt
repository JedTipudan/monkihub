<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes"/>
  <xsl:template match="/messages">
    <div class="xml-output">
      <h3>📨 Messages (XSLT Transformed)</h3>
      <table class="xslt-table">
        <thead>
          <tr><th>ID</th><th>Sender</th><th>Room</th><th>Content</th><th>Timestamp</th></tr>
        </thead>
        <tbody>
          <xsl:for-each select="message">
            <tr>
              <td><xsl:value-of select="@id"/></td>
              <td><xsl:value-of select="sender"/></td>
              <td><xsl:value-of select="room"/></td>
              <td><xsl:value-of select="content"/></td>
              <td><xsl:value-of select="timestamp"/></td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </div>
  </xsl:template>
</xsl:stylesheet>
